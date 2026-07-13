import type { APIRoute } from 'astro';
import { SECURITY_HEADERS } from '@infrastructure/security/headers';

export const prerender = false;

// ─── Liveness check (público) ────────────────────────────
// Responde 200 si el proceso Node está vivo y sirviendo requests.
// NO toca la DB ni servicios externos: es barato de poll-ear (Uptime Kuma)
// y no expone información interna. Para el estado de dependencias usar
// /api/health/deep (protegido con token).

export const GET: APIRoute = () => {
	return new Response(
		JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }),
		{ status: 200, headers: SECURITY_HEADERS },
	);
};
