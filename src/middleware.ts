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
];

const PUBLIC_PREFIXES: string[] = ['/api/'];

// ─── Definición de acceso por rol ──────────────────────
// Usa ROLES.* para mantener consistencia con la BD
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

export const onRequest = defineMiddleware(async (context, next) => {
	const { cookies, url, redirect, request } = context;
	const pathname = url.pathname;

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
	const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname === route);
	const isPublicPrefix = PUBLIC_PREFIXES.some((prefix) =>
		pathname.startsWith(prefix),
	);

	if (isPublicRoute || isPublicPrefix) {
		return next();
	}

	// ─── 5. Redirigir usuarios no autenticados ────────────
	if (!user) {
		return redirect(PATHS.signIn);
	}

	// ─── 6. Obtener roles del usuario ──────────────────────
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

	// ─── 7. RBAC: Verificar acceso por rol ────────────────
	const matchedRoute = ROLE_PROTECTED_ROUTES.find((config) =>
		pathname.startsWith(config.path),
	);

	if (matchedRoute && !hasAnyRole(userRoles, matchedRoute.roles)) {
		return redirect(
			`/?status=error&msg=${encodeURIComponent(matchedRoute.errorMsg)}`,
		);
	}

	return next();
});
