// ─── Thin handler: Sign Out ─────────────────────────────
export const prerender = false;

import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '@infrastructure/supabase';
import { AuthService, PATHS, AuthError, redirectWithMessage } from '@infrastructure/auth';
import type { SupabaseClient } from '@supabase/supabase-js';

// GET: prefetch de Astro o navegación directa → redirigir al sign-in
export const GET: APIRoute = async ({ redirect }) => {
	return redirect(PATHS.signIn);
};

export const POST: APIRoute = async ({ request, cookies, redirect, locals }) => {
	try {
		const allCookies = request.headers.get('cookie') ?? '';
		const supabaseCookieNames = allCookies
			.split(';')
			.map((c) => c.trim().split('=')[0]?.trim() ?? '')
			.filter((name) => name.startsWith('sb-') && name.length > 0);

		const supabase =
			(locals.supabase as SupabaseClient | undefined) ??
			createSupabaseServerClient({
				headers: request.headers,
				cookies,
			});
		const auth = new AuthService(supabase, cookies);

		await auth.signOut();

		for (const name of supabaseCookieNames) {
			cookies.set(name, '', {
				path: '/',
				maxAge: 0,
			});
		}

		return redirect(PATHS.signIn);
	} catch (error) {
		const message =
			error instanceof AuthError
				? error.message
				: 'No se pudo cerrar sesión. Inténtalo nuevamente.';
		return redirectWithMessage(redirect, message, 'error', PATHS.home);
	}
};
