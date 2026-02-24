// ─── Astro Middleware: Auth Guard + RBAC (Role-Based Access Control) ─────
import { defineMiddleware } from 'astro:middleware';
import { createSupabaseServerClient } from '@lib/supabase';
import type { AuthUser } from '@lib/auth';
import { mapSupabaseUser, PATHS } from '@lib/auth';
import {
	ROLES,
	hasAnyRole,
	extractRoleNames,
	type RouteRoleConfig,
	type UserRoleRow,
} from '@lib/roles';

// ─── Rutas públicas (sin autenticación) ────────────────
const PUBLIC_ROUTES: string[] = [
	'/sign-in',
	'/sign-up',
	'/forgot-password',
	'/reset-password',
	'/api/auth',
	'/callback',
];

const PUBLIC_PREFIXES: string[] = ['/api/'];

// ─── Definición de acceso por rol ──────────────────────
const ROLE_PROTECTED_ROUTES: RouteRoleConfig[] = [
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
		path: '/operaciones/',
		roles: [ROLES.ADMIN, ROLES.OPERACIONES],
		errorMsg: 'Acceso solo para operaciones',
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
	{
		path: '/pages/',
		roles: [ROLES.PARTNER, ROLES.CLIENT],
		errorMsg: 'Acceso solo para clientes o partners',
	},
	{
		path: '/profile/',
		roles: [ROLES.ADMIN, ROLES.PARTNER, ROLES.CLIENT, ROLES.OPERACIONES],
		errorMsg: 'Acceso no autorizado',
	},
];

/**
 * Normaliza el pathname eliminando el trailing slash
 * para evitar mismatches entre "/sign-in" y "/sign-in/"
 */
function normalizePath(path: string): string {
	if (path.length > 1 && path.endsWith('/')) {
		return path.slice(0, -1);
	}
	return path;
}

export const onRequest = defineMiddleware(async (context, next) => {
	const { cookies, url, redirect, request } = context;
	const pathname = normalizePath(url.pathname);

	// ─── 1. Crear cliente Supabase per-request ─────────────
	const supabase = createSupabaseServerClient({
		headers: request.headers,
		cookies,
	});

	// ─── 2. Obtener usuario autenticado ────────────────────
	let user: AuthUser | null = null;

	try {
		const { data, error } = await supabase.auth.getUser();
		if (!error && data.user) {
			user = mapSupabaseUser(data.user);
		}
	} catch {
		// Usuario no autenticado — se maneja abajo
	}

	// ─── 3. Almacenar usuario en locals ────────────────────
	context.locals.user = user;
	context.locals.userRoles = [];

	// ─── 4. Rutas públicas — dejar pasar siempre ──────────
	const isPublicRoute = PUBLIC_ROUTES.some(
		(route) => pathname === route || pathname.startsWith(`${route}/`),
	);
	const isPublicPrefix = PUBLIC_PREFIXES.some((prefix) =>
		pathname.startsWith(prefix),
	);

	if (isPublicRoute || isPublicPrefix) {
		return next();
	}

	// ─── 4b. Redirigir usuarios no autenticados (excepto ruta raíz) ──
	if (!user && pathname !== '/') {
		return redirect(PATHS.signIn);
	}

	// ─── 5. Obtener roles del usuario ──────────────────────
	if (user) {
		const { data: userRolesData, error: rolesError } = await supabase
			.from('user_roles')
			.select('rol_id, roles ( name )')
			.eq('user_id', user.id);

		if (rolesError) {
			console.error('[middleware] Error al obtener roles:', rolesError.message);
		}

		const userRoles = extractRoleNames(
			userRolesData as unknown as UserRoleRow[] | null,
		);

		context.locals.userRoles = userRoles;
	}

	// ─── 6. Ruta raíz — dejar pasar (la página decide qué mostrar) ──
	if (pathname === '/') {
		return next();
	}

	// ─── 7. RBAC: Verificar acceso por rol ────────────────
	const matchedRoute = ROLE_PROTECTED_ROUTES.find((config) =>
		pathname.startsWith(config.path),
	);

	if (matchedRoute && !hasAnyRole(context.locals.userRoles, matchedRoute.roles)) {
		return redirect(
			`/?status=error&msg=${encodeURIComponent(matchedRoute.errorMsg)}`,
		);
	}

	return next();
});
