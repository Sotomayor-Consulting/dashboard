// src/middleware.ts
// ─── Middleware de autenticación y autorización ─────────
// Valida sesión via @supabase/ssr (getClaims) y aplica control de acceso por rol.

import { createSupabaseServerClient } from '@lib/supabase';
import { PATHS } from '@lib/auth';
import type { RouteRoleConfig } from '@lib/roles';
import { ROLES, extractRoleNames, hasAnyRole } from '@lib/roles';
import type { UserRoleRow } from '@lib/roles';
import type { User } from '@supabase/supabase-js';
import { SECURITY_HEADERS } from '@lib/security/headers';

// ─── CSRF: Métodos que modifican estado ─────────────────
const STATE_CHANGING_METHODS = new Set(['POST', 'PUT', 'DELETE', 'PATCH']);

// ─── CSP: Content-Security-Policy ───────────────────────
// Construido una sola vez al iniciar el server (las env vars no cambian en runtime).
const SUPABASE_URL =
	process.env.PUBLIC_SUPABASE_URL ?? import.meta.env.PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_HOST = SUPABASE_URL ? new URL(SUPABASE_URL).host : '';
const SUPABASE_WSS = SUPABASE_HOST ? `wss://${SUPABASE_HOST}` : '';

const IS_PRODUCTION = import.meta.env.PROD;

const CSP_DIRECTIVES = [
	// Fallback: bloquear todo lo no listado
	"default-src 'self'",
	// Scripts: 'unsafe-inline' necesario por ~35 <script is:inline> + define:vars en Astro
	// 'unsafe-eval' necesario por Alpine.js (usa new Function() para evaluar x-data, x-show, @click, etc.)
	`script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://unpkg.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://buttons.github.io https://esm.sh https://accounts.google.com`,
	// Estilos: 'unsafe-inline' necesario por <style> scoped/global de Astro + Flowbite
	`style-src 'self' 'unsafe-inline' https://fonts.cdnfonts.com https://fonts.googleapis.com`,
	// Fuentes
	`font-src 'self' https://fonts.gstatic.com https://fonts.cdnfonts.com`,
	// Conexiones: fetch/XHR/WebSocket
	`connect-src 'self' ${SUPABASE_URL} ${SUPABASE_WSS} https://unpkg.com https://esm.sh https://api.stripe.com https://accounts.google.com`,
	// Imágenes
	`img-src 'self' data: blob: ${SUPABASE_URL} https://app.sotomayorconsulting.com https://sotomayorconsulting.com https://i.imgur.com https://api.dicebear.com`,
	// Iframes (Stripe Elements crea iframes)
	`frame-src 'self' https://js.stripe.com https://accounts.google.com`,
	// Bloquear object/embed (Flash, plugins legacy)
	"object-src 'none'",
	// Base URI: solo 'self' (previene <base> injection)
	"base-uri 'self'",
	// Form actions: permitir redirects OAuth (self → Supabase → Google → callback)
	`form-action 'self' ${SUPABASE_URL} https://accounts.google.com`,
	// Upgrade insecure requests solo en producción (en dev rompe http://localhost)
	...(IS_PRODUCTION ? ['upgrade-insecure-requests'] : []),
].join('; ');


/**
 * Validación de origen contra CSRF.
 * Compara el header Origin (o Referer como fallback) con el header Host.
 * Solo aplica a métodos que modifican estado (POST, PUT, DELETE, PATCH).
 * Retorna null si OK, o un Response 403 si el origen no coincide.
 */
function checkCsrf(request: Request): Response | null {
	if (!STATE_CHANGING_METHODS.has(request.method)) return null;

	const normalizeHost = (value: string) =>
		value.replace(/:443$|:80$/i, '').trim().toLowerCase();

	const host = normalizeHost(
		request.headers.get('x-forwarded-host') ||
		request.headers.get('host') ||
		'',
	);
	if (!host) return null; // Sin host no podemos validar — defensive, no bloquear

	// Intentar Origin primero, luego Referer como fallback
	const origin = request.headers.get('origin');
	const referer = request.headers.get('referer');

	// Si no hay ni Origin ni Referer, el request podría ser legítimo
	// (ej. server-to-server, herramientas de testing). Solo bloquear
	// cuando hay un Origin/Referer que NO coincide.
	const sourceUrl = origin || referer;
	if (!sourceUrl) return null;

	try {
		const sourceHost = normalizeHost(new URL(sourceUrl).host);
		if (sourceHost !== host) {
			return new Response(
				JSON.stringify({ error: 'Origen no permitido' }),
				{ status: 403, headers: SECURITY_HEADERS },
			);
		}
	} catch {
		// URL inválida en Origin/Referer → bloquear
		return new Response(
			JSON.stringify({ error: 'Origen no permitido' }),
			{ status: 403, headers: SECURITY_HEADERS },
		);
	}

	return null;
}

/**
 * Añade CSP y otros headers de seguridad a respuestas HTML.
 * No modifica respuestas JSON/API ni redirects.
 */
function addSecurityHeaders(response: Response, pathname: string): Response {
	// No aplicar CSP a rutas API (retornan JSON, no HTML)
	if (pathname.startsWith('/api')) return response;
	// No modificar redirects (3xx)
	if (response.status >= 300 && response.status < 400) return response;

	const contentType = response.headers.get('content-type') ?? '';
	// Solo aplicar a respuestas HTML
	if (!contentType.includes('text/html')) return response;

	response.headers.set('Content-Security-Policy', CSP_DIRECTIVES);
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('X-Frame-Options', 'DENY');
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
	// Permitir que la ventana principal pueda comunicarse con popups OAuth
	response.headers.set('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');

	return response;
}

// ─── Rutas públicas y de autenticación ──────────────────
// Definidas aquí (única fuente de verdad) para evitar
// desincronización con constantes externas.

/** Rutas siempre públicas (nunca bloquear) */
const PUBLIC_ROUTES: readonly string[] = [
	'/api',
	'/_image',
	'/start',
	'/incorporacion-y-pago',
	'/test',
	'/playground',
	'/assets',
	'/_image',
];

/** Rutas de autenticación (redirigir al dash si ya está logueado) */
const AUTH_ROUTES: readonly string[] = [
	'/sign-in',
	'/sign-up',
	'/forgot-password',
];

// ─── Configuración de acceso por rol ────────────────────
// Evaluadas en orden: la primera que coincida decide.
// Shared folders van ANTES que single-role folders para evitar
// que /pages/ bloquee a partners antes de llegar al check compartido.
const ROLE_ROUTES: RouteRoleConfig[] = [
	// Shared (multi-rol) — evaluar primero
	{
		path: '/profile/',
		roles: [ROLES.ADMIN, ROLES.PARTNER, ROLES.CLIENT],
		errorMsg: 'Acceso no autorizado',
	},
	{
		path: '/documentos/',
		roles: [ROLES.PARTNER, ROLES.CLIENT],
		errorMsg: 'Acceso no autorizado',
	},
	{
		path: '/servicios/',
		roles: [ROLES.PARTNER, ROLES.CLIENT],
		errorMsg: 'Acceso no autorizado',
	},
	{
		path: '/my-companies/',
		roles: [ROLES.PARTNER, ROLES.CLIENT],
		errorMsg: 'Acceso no autorizado',
	},
	// Legacy (mantener hasta migrar todos los links)
	{
		path: '/pages/',
		roles: [ROLES.PARTNER, ROLES.CLIENT],
		errorMsg: 'Acceso no autorizado',
	},
	// Single-rol — admin
	{
		path: '/companies/',
		roles: [ROLES.ADMIN],
		errorMsg: 'Acceso solo para admins',
	},
	{
		path: '/usuarios/',
		roles: [ROLES.ADMIN],
		errorMsg: 'Acceso solo para admins',
	},
	{
		path: '/formularios/',
		roles: [ROLES.ADMIN],
		errorMsg: 'Acceso solo para admins',
	},
	{
		path: '/admin/',
		roles: [ROLES.ADMIN],
		errorMsg: 'Acceso solo para admins',
	},
	// Legacy (mantener hasta eliminar old pages)
	{
		path: '/crud/',
		roles: [ROLES.ADMIN],
		errorMsg: 'Acceso solo para admins',
	},
	// Partners
	{
		path: '/partners/',
		roles: [ROLES.PARTNER],
		errorMsg: 'Acceso solo para partners',
	},
	{
		path: '/afiliados/',
		roles: [ROLES.PARTNER],
		errorMsg: 'Acceso solo para partners',
	},
];

// ─── Middleware ──────────────────────────────────────────

// Cache in-memory para roles de usuario (evita query a DB en cada request)
const ROLES_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos
const rolesCache = new Map<string, { roles: string[]; expires: number }>();

async function getUserRoles(
	supabase: ReturnType<typeof createSupabaseServerClient>,
	userId: string,
): Promise<string[]> {
	const cached = rolesCache.get(userId);
	if (cached && cached.expires > Date.now()) {
		return cached.roles;
	}

	const { data: usuarioData } = await supabase
		.from('user_roles')
		.select('rol_id, roles (name)')
		.eq('user_id', userId);

	const roles = extractRoleNames(
		(usuarioData as UserRoleRow[] | null) ?? null,
	);

	rolesCache.set(userId, {
		roles,
		expires: Date.now() + ROLES_CACHE_TTL_MS,
	});

	// Evitar memory leak: limpiar entradas expiradas periódicamente
	if (rolesCache.size > 1000) {
		const now = Date.now();
		for (const [key, val] of rolesCache) {
			if (val.expires <= now) rolesCache.delete(key);
		}
	}

	return roles;
}

export function onRequest(context: any, next: any) {
	const { redirect, url } = context;
	const pathname = url.pathname;

	// Rutas siempre públicas (API, landing pages, etc.)
	const isPublicFolder = PUBLIC_ROUTES.some((route) =>
		pathname.startsWith(route),
	);

	return (async () => {
		// 0) CSRF: Validar origen en métodos que modifican estado
		const csrfResponse = checkCsrf(context.request);
		if (csrfResponse) return csrfResponse;

		// 1) Crear cliente Supabase SSR (per-request)
		const supabase = createSupabaseServerClient({
			headers: context.request.headers,
			cookies: context.cookies,
		});

		// 2) Validar sesión — getClaims() verifica el JWT localmente (más rápido
		//    que getUser() que hace una llamada HTTP al servidor de auth).
		//    También refresca tokens expirados y actualiza cookies automáticamente.
		//    IMPORTANTE: No ejecutar código entre createServerClient y getClaims().
		const { data, error } = await supabase.auth.getClaims();

		// Exponer el cliente para que los componentes lo reutilicen
		// sin crear instancias adicionales (evita ResponseSentError)
		context.locals.supabase = supabase;

		// 3) Poblar locals si hay usuario autenticado
		if (!error && data?.claims) {
			const claims = data.claims;

			// Construir objeto User-compatible desde los JWT claims.
			// Los componentes downstream usan user.id, user.email y user.user_metadata.
			const user: User = {
				id: claims.sub,
				email: claims.email ?? '',
				user_metadata: claims.user_metadata ?? {},
				app_metadata: claims.app_metadata ?? {},
				aud:
					typeof claims.aud === 'string' ? claims.aud : (claims.aud[0] ?? ''),
				created_at: new Date(claims.iat * 1000).toISOString(),
				is_anonymous: claims.is_anonymous ?? false,
			} as User;

			const userRoles = await getUserRoles(supabase, claims.sub);

			context.locals.user = user;
			context.locals.userRoles = userRoles;
		} else {
			context.locals.user = null;
			context.locals.userRoles = [];
		}

		// 4) Rutas públicas: dejar pasar sin restricción
		if (isPublicFolder) {
			const response = await next();
			return addSecurityHeaders(response, pathname);
		}

		// 5) Auth routes: si ya está logueado, redirigir al dashboard
		const isAuthRoute = AUTH_ROUTES.some((route) => pathname === route);
		if (isAuthRoute) {
			if (context.locals.user) {
				return redirect(PATHS.home);
			}
			const response = await next();
			return addSecurityHeaders(response, pathname);
		}

		// 6) Reset password: ruta pública especial (necesita token en URL)
		if (pathname === PATHS.resetPassword) {
			const response = await next();
			return addSecurityHeaders(response, pathname);
		}

		// 7) Usuario no autenticado en ruta protegida → sign-in
		if (!context.locals.user) {
			return redirect(PATHS.signIn);
		}

		// 8) Control de acceso basado en roles
		const userRoles = context.locals.userRoles as string[];

		for (const route of ROLE_ROUTES) {
			if (pathname.startsWith(route.path)) {
				if (!hasAnyRole(userRoles, route.roles)) {
					return redirect(
						`/?status=error&msg=${encodeURIComponent(route.errorMsg)}`,
					);
				}
				// Acceso concedido para esta ruta — no seguir evaluando
				break;
			}
		}

		const response = await next();
		return addSecurityHeaders(response, pathname);
	})();
}
