// src/middleware.ts
// ─── Middleware de autenticación y autorización ─────────
// Valida sesión via @supabase/ssr y aplica control de acceso por rol.

import { createSupabaseServerClient } from '@lib/supabase';
import { PATHS } from '@lib/auth';
import type { RouteRoleConfig } from '@lib/roles';
import { ROLES, extractRoleNames, hasAnyRole } from '@lib/roles';
import type { UserRoleRow } from '@lib/roles';

// ─── Rutas públicas y de autenticación ──────────────────
// Definidas aquí (única fuente de verdad) para evitar
// desincronización con constantes externas.

/** Rutas siempre públicas (nunca bloquear) */
const PUBLIC_ROUTES: readonly string[] = [
	'/api',
	'/start',
	'/incorporacion-y-pago',
	'/test',
	'/playground',
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
		path: '/pages/',
		roles: [ROLES.PARTNER, ROLES.CLIENT],
		errorMsg: 'Acceso no autorizado',
	},
	// Single-rol
	{
		path: '/crud/',
		roles: [ROLES.ADMIN],
		errorMsg: 'Acceso solo para admins',
	},
	{
		path: '/admin/',
		roles: [ROLES.ADMIN],
		errorMsg: 'Acceso solo para admins',
	},
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

export function onRequest(context: any, next: any) {
	const { redirect, url } = context;
	const pathname = url.pathname;

	// Rutas siempre públicas (API, landing pages, etc.)
	const isPublicFolder = PUBLIC_ROUTES.some((route) =>
		pathname.startsWith(route),
	);

	return (async () => {
		// 1) Crear cliente Supabase SSR (per-request)
		const supabase = createSupabaseServerClient({
			headers: context.request.headers,
			cookies: context.cookies,
		});

		// Exponer el cliente para que los componentes lo reutilicen
		// sin crear instancias adicionales (evita ResponseSentError)
		context.locals.supabase = supabase;

		// 2) Validar sesión — siempre usar getUser() (verificado server-side)
		const {
			data: { user },
			error,
		} = await supabase.auth.getUser();

		// 3) Poblar locals si hay usuario autenticado
		if (!error && user) {
			const { data: usuarioData } = await supabase
				.from('user_roles')
				.select('rol_id, roles (name)')
				.eq('user_id', user.id);

			const userRoles = extractRoleNames(
				(usuarioData as UserRoleRow[] | null) ?? null,
			);

			context.locals.user = user;
			context.locals.userRoles = userRoles;
		} else {
			context.locals.user = null;
			context.locals.userRoles = [];
		}

		// 4) Rutas públicas: dejar pasar sin restricción
		if (isPublicFolder) {
			return next();
		}

		// 5) Auth routes: si ya está logueado, redirigir al dashboard
		const isAuthRoute = AUTH_ROUTES.some((route) => pathname === route);
		if (isAuthRoute) {
			if (user) {
				return redirect(PATHS.home);
			}
			return next();
		}

		// 6) Reset password: ruta pública especial (necesita token en URL)
		if (pathname === PATHS.resetPassword) {
			return next();
		}

		// 7) Usuario no autenticado en ruta protegida → sign-in
		if (!user) {
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

		return next();
	})();
}
