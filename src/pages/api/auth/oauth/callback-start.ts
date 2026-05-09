// ─── Thin handler: OAuth Callback (start flow) ─────────
export const prerender = false;

import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '@infrastructure/supabase';
import { AuthService, AuthError, redirectWithMessage } from '@infrastructure/auth';

export const GET: APIRoute = async ({ request, cookies, redirect }) => {
	const { searchParams } = new URL(request.url);
	const code = searchParams.get('code');
	const rawNext = searchParams.get('next') ?? '/';
	// Prevenir open redirect: solo aceptar rutas relativas del mismo origen
	const next =
		rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/';

	if (!code) {
		return redirectWithMessage(
			redirect,
			'Error en autenticación: no se recibió código.',
			'error',
			'/',
		);
	}

	try {
		const supabase = createSupabaseServerClient({
			headers: request.headers,
			cookies,
		});
		const auth = new AuthService(supabase, cookies);

		await auth.exchangeCodeForSession(code);

		return redirect(next);
	} catch (error) {
		const message =
			error instanceof AuthError ? error.message : 'Error en autenticación.';
		return redirectWithMessage(redirect, message, 'error', '/');
	}
};
