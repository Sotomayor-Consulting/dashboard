// src/pages/api/auth/signout.ts
// ─── Thin handler: Sign Out ─────────────────────────────
export const prerender = false;

import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '@lib/supabase';
import { AuthService, PATHS } from '@lib/auth';

// GET: prefetch de Astro o navegación directa → redirigir al sign-in
export const GET: APIRoute = async ({ redirect }) => {
	return redirect(PATHS.signIn);
};

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
	const supabase = createSupabaseServerClient({
		headers: request.headers,
		cookies,
	});
	const auth = new AuthService(supabase, cookies);

	await auth.signOut();

	// Limpiar cookies de Supabase explícitamente.
	// Supabase SSR usa cookies chunked: sb-<ref>-auth-token.0, .1, etc.
	// cookies.delete() puede fallar si los atributos no coinciden exactamente,
	// así que usamos set() con maxAge=0 para forzar la expiración.
	const expireOpts = { path: '/', maxAge: 0, httpOnly: true, secure: true, sameSite: 'lax' as const };
	const allCookies = request.headers.get('Cookie') ?? '';
	const sbCookieNames = allCookies
		.split(';')
		.map((c) => c.trim().split('=')[0])
		.filter((name) => name.startsWith('sb-'));
	for (const name of sbCookieNames) {
		cookies.set(name, '', expireOpts);
	}

	return redirect(PATHS.signIn);
};
