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

	// Limpiar cookies de Supabase explícitamente para garantizar cierre de sesión
	const cookieNames = ['sb-access-token', 'sb-refresh-token'];
	for (const name of cookieNames) {
		cookies.delete(name, { path: '/' });
	}
	// Supabase SSR usa cookies con prefijo del proyecto (sb-<ref>-auth-token)
	const allCookies = request.headers.get('Cookie') ?? '';
	const sbCookieNames = allCookies
		.split(';')
		.map((c) => c.trim().split('=')[0])
		.filter((name) => name.startsWith('sb-'));
	for (const name of sbCookieNames) {
		cookies.delete(name, { path: '/' });
	}

	return redirect(PATHS.signIn);
};
