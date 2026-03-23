// src/pages/api/auth/google.ts
// ─── Thin handler: Google OAuth Initiation ──────────────
export const prerender = false;

import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '@lib/supabase';
import { AuthService, AuthError, redirectWithMessage } from '@lib/auth';
import { safeBack } from '@lib/security/headers';

const BACK_PATH = '/start';

export const POST: APIRoute = async ({ request, cookies, redirect, url }) => {
	const back = safeBack(url.searchParams.get('back'), BACK_PATH);

	try {
		const supabase = createSupabaseServerClient({
			headers: request.headers,
			cookies,
		});
		const auth = new AuthService(supabase, cookies);

		const redirectTo = `${url.origin}/api/auth/callback_start?next=/`;
		const result = await auth.signInWithOAuth('google', redirectTo);

		return redirect(result.url);
	} catch (error) {
		const message =
			error instanceof AuthError
				? error.message
				: 'Error inesperado al iniciar OAuth.';
		return redirectWithMessage(redirect, message, 'error', back);
	}
};
