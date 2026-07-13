// ─── Rate limiting in-memory (sliding window) ────────────
// Suficiente para el deploy actual (un solo contenedor Node). Si se escala
// a múltiples instancias, migrar a un backend compartido (Redis/Upstash).

const buckets = new Map<string, number[]>();

const MAX_BUCKETS = 10_000; // tope de memoria ante abuso de claves únicas

/**
 * Devuelve `true` si la request está dentro del límite; `false` si debe
 * rechazarse (HTTP 429). Ventana deslizante por clave (p.ej. `userId:ruta`).
 */
export function checkRateLimit(
	key: string,
	limit = 10,
	windowMs = 60_000,
): boolean {
	const now = Date.now();
	const cutoff = now - windowMs;

	let hits = buckets.get(key);
	if (!hits) {
		if (buckets.size >= MAX_BUCKETS) buckets.clear();
		hits = [];
		buckets.set(key, hits);
	}

	// Purga de la ventana expirada
	while (hits.length > 0 && hits[0]! < cutoff) hits.shift();

	if (hits.length >= limit) return false;
	hits.push(now);
	return true;
}

/**
 * Como `checkRateLimit` pero SIN consumir un intento. Para límites donde
 * solo cuentan los fallos (p.ej. logins fallidos por email, per OWASP):
 * se hace peek antes de intentar y `recordHit` solo si el intento falla.
 */
export function peekRateLimit(
	key: string,
	limit: number,
	windowMs: number,
): boolean {
	const now = Date.now();
	const cutoff = now - windowMs;
	const hits = buckets.get(key);
	if (!hits) return true;
	while (hits.length > 0 && hits[0]! < cutoff) hits.shift();
	return hits.length < limit;
}

/** Registra un hit sin evaluar el límite (contrapartida de `peekRateLimit`). */
export function recordHit(key: string): void {
	let hits = buckets.get(key);
	if (!hits) {
		if (buckets.size >= MAX_BUCKETS) buckets.clear();
		hits = [];
		buckets.set(key, hits);
	}
	hits.push(Date.now());
}

export function rateLimitResponse(
	headers: Record<string, string>,
	retryAfterSeconds = 60,
): Response {
	return new Response(
		JSON.stringify({ error: 'Demasiadas solicitudes. Intenta más tarde.' }),
		{
			status: 429,
			headers: { ...headers, 'Retry-After': String(retryAfterSeconds) },
		},
	);
}
