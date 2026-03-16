// src/middleware.ts
// ─── Middleware de autenticación y autorización ─────────
// Valida sesión via @supabase/ssr (getClaims) y aplica control de acceso por rol.

import { createSupabaseServerClient } from '@lib/supabase';
import { PATHS } from '@lib/auth';
import type { RouteRoleConfig } from '@lib/roles';
import { ROLES, extractRoleNames, hasAnyRole } from '@lib/roles';
import type { UserRoleRow } from '@lib/roles';
import type { User } from '@supabase/supabase-js';

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
// src/middleware.ts
// ─── Middleware de autenticación y autorización ─────────
// Valida sesión via @supabase/ssr (getClaims) y aplica control de acceso por rol.

import { createSupabaseServerClient } from '@lib/supabase';
import { PATHS } from '@lib/auth';
import type { RouteRoleConfig } from '@lib/roles';
import { ROLES, extractRoleNames, hasAnyRole } from '@lib/roles';
import type { UserRoleRow } from '@lib/roles';
import type { User } from '@supabase/supabase-js';

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
		const accessToken = cookies.get('sb-access-token');
		const refreshToken = cookies.get('sb-refresh-token');

		let user = null;

		if (accessToken && refreshToken) {
			const { data: sessionData, error: sessionError } =
				await supabase.auth.setSession({
					access_token: accessToken.value,
					refresh_token: refreshToken.value,
				});

			if (sessionError || !sessionData?.session) {
				cookies.delete('sb-access-token', { path: '/' });
				cookies.delete('sb-refresh-token', { path: '/' });
				return redirect('/sign-in');
			}

			const {
				data: { user: authUser },
				error,
			} = await supabase.auth.getUser(accessToken.value);

			if (!error && authUser) {
				user = authUser;

			const { data: usuarioData } = await supabase
				.from('user_roles')
				.select('rol_id, roles (name)')
				.eq('user_id', claims.sub);

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
			if (context.locals.user) {
				return redirect(PATHS.home);
			}
			return next();
		}

		// 6) Reset password: ruta pública especial (necesita token en URL)
		if (pathname === PATHS.resetPassword) {
			return next();
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

		return next();
	})();
}
