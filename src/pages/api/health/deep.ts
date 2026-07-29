import type { APIRoute } from 'astro';
import { createHash, timingSafeEqual } from 'node:crypto';
import { supabaseAdmin } from '@infrastructure/supabase/admin';
import { storage } from '@infrastructure/storage';
import { SECURITY_HEADERS } from '@infrastructure/security/headers';
import { createLogger } from '@infrastructure/logging';

const log = createLogger('health.deep');

export const prerender = false;

// ─── Readiness check (solo interno) ──────────────────────
// Verifica dependencias reales: DB, Auth y Storage de Supabase (críticas)
// y el microservicio Carbone (no crítica → "degraded"). Protegido con
// `Authorization: Bearer <HEALTH_CHECK_TOKEN>` para Uptime Kuma interno.
// Sin el token configurado el endpoint queda deshabilitado (401).

const HEALTH_CHECK_TOKEN =
	process.env.HEALTH_CHECK_TOKEN ?? import.meta.env.HEALTH_CHECK_TOKEN ?? '';
const SUPABASE_URL =
	process.env.PUBLIC_SUPABASE_URL ?? import.meta.env.PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_PUBLISHABLE_KEY =
	process.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
	import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
	'';
const RENDER_SERVER_URL =
	process.env.RENDER_SERVER_URL ?? import.meta.env.RENDER_SERVER_URL ?? '';

const CHECK_TIMEOUT_MS = 5_000;

interface CheckResult {
	ok: boolean;
	latencyMs: number;
	error?: string;
}

function isAuthorized(request: Request): boolean {
	if (!HEALTH_CHECK_TOKEN) {
		log.warn(
			'HEALTH_CHECK_TOKEN no configurado; /api/health/deep deshabilitado',
		);
		return false;
	}
	const header = request.headers.get('authorization') ?? '';
	const token = header.startsWith('Bearer ') ? header.slice(7) : '';
	if (!token) return false;
	// Comparación en tiempo constante sobre hashes (longitudes iguales)
	const provided = createHash('sha256').update(token).digest();
	const expected = createHash('sha256').update(HEALTH_CHECK_TOKEN).digest();
	return timingSafeEqual(provided, expected);
}

async function runCheck(fn: () => Promise<void>): Promise<CheckResult> {
	const start = Date.now();
	let timer: ReturnType<typeof setTimeout> | undefined;
	try {
		const work = fn();
		work.catch(() => {}); // evita unhandled rejection si gana el timeout
		await Promise.race([
			work,
			new Promise<never>((_, reject) => {
				timer = setTimeout(
					() => reject(new Error('TIMEOUT')),
					CHECK_TIMEOUT_MS,
				);
			}),
		]);
		return { ok: true, latencyMs: Date.now() - start };
	} catch (error) {
		return {
			ok: false,
			latencyMs: Date.now() - start,
			error: error instanceof Error ? error.message : 'UNKNOWN',
		};
	} finally {
		if (timer) clearTimeout(timer);
	}
}

const checkDatabase = () =>
	runCheck(async () => {
		// HEAD + count: no depende de nombres de columnas ni transfiere filas
		const { error } = await supabaseAdmin
			.from('roles')
			.select('*', { count: 'exact', head: true });
		if (error) throw new Error(error.message);
	});

const checkAuth = () =>
	runCheck(async () => {
		const res = await fetch(`${SUPABASE_URL}/auth/v1/health`, {
			headers: { apikey: SUPABASE_PUBLISHABLE_KEY },
			signal: AbortSignal.timeout(CHECK_TIMEOUT_MS),
		});
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
	});

const checkStorage = () => runCheck(() => storage.healthCheck());

const checkRenderServer = () =>
	runCheck(async () => {
		const res = await fetch(RENDER_SERVER_URL, {
			signal: AbortSignal.timeout(CHECK_TIMEOUT_MS),
		});
		// Alcanzable = sano; un 404 en la raíz del microservicio es aceptable
		if (res.status >= 500) throw new Error(`HTTP ${res.status}`);
	});

export const GET: APIRoute = async ({ request }) => {
	if (!isAuthorized(request)) {
		return new Response(JSON.stringify({ error: 'No autorizado' }), {
			status: 401,
			headers: SECURITY_HEADERS,
		});
	}

	const [database, auth, storage, renderServer] = await Promise.all([
		checkDatabase(),
		checkAuth(),
		checkStorage(),
		RENDER_SERVER_URL ? checkRenderServer() : Promise.resolve(null),
	]);

	const critical = [database, auth, storage];
	const nonCritical = renderServer ? [renderServer] : [];

	const status = critical.some((c) => !c.ok)
		? 'down'
		: nonCritical.some((c) => !c.ok)
			? 'degraded'
			: 'ok';

	if (status !== 'ok') {
		log.warn('health check degradado', {
			status,
			database,
			auth,
			storage,
			renderServer,
		});
	}

	return new Response(
		JSON.stringify({
			status,
			timestamp: new Date().toISOString(),
			checks: {
				database,
				auth,
				storage,
				...(renderServer ? { renderServer } : {}),
			},
		}),
		{ status: status === 'down' ? 503 : 200, headers: SECURITY_HEADERS },
	);
};
