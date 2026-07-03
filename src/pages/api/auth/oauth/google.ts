// ─── Thin handler: Google OAuth Initiation ──────────────
export const prerender = false;

import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '@infrastructure/supabase';
import { AuthService, AuthError, redirectWithMessage } from '@infrastructure/auth';
import { safeBack } from '@infrastructure/security/headers';

const BACK_PATH = '/start';

export const POST: APIRoute = async ({ request, cookies, redirect, url }) => {
	const back = safeBack(url.searchParams.get('back'), BACK_PATH);
	const next = safeBack(url.searchParams.get('next'), BACK_PATH);

	try {
		const supabase = createSupabaseServerClient({
			headers: request.headers,
			cookies,
		});
		const auth = new AuthService(supabase, cookies);

		const redirectToUrl = new URL(
			`${url.origin}/api/auth/oauth/callback-start`,
		);
		redirectToUrl.searchParams.set('next', next);
		const result = await auth.signInWithOAuth(
			'google',
			redirectToUrl.toString(),
		);

		return redirect(result.url);
	} catch (error) {
		const message =
			error instanceof AuthError
				? error.message
				: 'Error inesperado al iniciar OAuth.';
		return redirectWithMessage(redirect, message, 'error', back);
	}
};
