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

export function rateLimitResponse(headers: Record<string, string>): Response {
	return new Response(
		JSON.stringify({ error: 'Demasiadas solicitudes. Intenta en un minuto.' }),
		{ status: 429, headers: { ...headers, 'Retry-After': '60' } },
	);
}
