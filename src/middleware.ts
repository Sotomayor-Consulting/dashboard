// src/middleware.ts
// ─── Astro Middleware: Auth Guard + Session Refresh ─────
// Basado en la documentación oficial de @supabase/ssr para Astro.
// Se ejecuta en CADA request server-side.

import { defineMiddleware } from 'astro:middleware';
import { createSupabaseServerClient } from '@lib/supabase';
import { PROTECTED_ROUTES, AUTH_ROUTES, PUBLIC_ROUTES, PATHS } from '@lib/auth';
import type { AuthUser } from '@lib/auth';
import { mapSupabaseUser } from '@lib/auth';

export const onRequest = defineMiddleware(async (context, next) => {
	const { cookies, url, redirect, request } = context;

	// ─── 1. Crear cliente Supabase per-request con cookies ─
	const supabase = createSupabaseServerClient({
		headers: request.headers,
		cookies,
	});

	// ─── 2. Refrescar sesión (CRÍTICO según docs de Supabase) ─
	// Si no se llama getUser() en el middleware, los usuarios pueden
	// perder sesión aleatoriamente porque las cookies no se refrescan.
	let user: AuthUser | null = null;

	try {
		const { data, error } = await supabase.auth.getUser();
		if (!error && data.user) {
			user = mapSupabaseUser(data.user);
		}
	} catch {
		// Silenciar errores de sesión — el usuario simplemente no está autenticado
	}

	// ─── 3. Almacenar usuario en locals ────────────────────
	context.locals.user = user;

	// ─── 4. Rutas públicas — dejar pasar siempre ──────────
	const isPublic = PUBLIC_ROUTES.some((route) =>
		url.pathname.startsWith(route),
	);
	if (isPublic) {
		return next();
	}

	// ─── 5. Proteger rutas que requieren auth ─────────────
	const isProtected = PROTECTED_ROUTES.some((route) =>
		url.pathname.startsWith(route),
	);
	if (isProtected && !user) {
		return redirect(PATHS.signIn);
	}

	// ─── 6. Redirigir usuarios logueados lejos de auth ───
	const isAuthRoute = AUTH_ROUTES.some((route) =>
		url.pathname.startsWith(route),
	);
	if (isAuthRoute && user) {
		return redirect(PATHS.dashboard);
	}

	return next();
});
