// src/pages/api/auth/callback_start.ts
// ─── Thin handler: OAuth Callback (start flow) ─────────
export const prerender = false;

import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '@lib/supabase';
import { AuthService, AuthError, redirectWithMessage } from '@lib/auth';

export const GET: APIRoute = async ({ request, cookies, redirect }) => {
	const { searchParams } = new URL(request.url);
	const code = searchParams.get('code');
	const next = searchParams.get('next') ?? '/';

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
