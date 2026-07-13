// ─── Thin handler: OAuth Callback ───────────────────────
export const prerender = false;

import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '@infrastructure/supabase';
import { AuthService, AuthError, PATHS, redirectWithMessage } from '@infrastructure/auth';
import { createLogger } from '@infrastructure/logging';

const log = createLogger('oauth.callback');

export const GET: APIRoute = async ({ url, request, cookies, redirect }) => {
	// 1) Error de OAuth (usuario cancela, etc.)
	const oauthError = url.searchParams.get('error');
	const oauthErrorDescription = url.searchParams.get('error_description');

	if (oauthError) {
		log.error('OAuth error', {
			error: oauthError,
			description: oauthErrorDescription,
		});
		return redirectWithMessage(
			redirect,
			oauthErrorDescription ??
				'No se pudo completar el inicio de sesión. Inténtalo nuevamente.',
			'error',
			PATHS.signIn,
		);
	}

	// 2) Código de autorización
	const code = url.searchParams.get('code');

	if (!code) {
		return redirectWithMessage(
			redirect,
			'No se proporcionó código de autorización. Vuelve a intentar iniciar sesión.',
			'error',
			PATHS.signIn,
		);
	}

	// 3) Intercambiar código por sesión delegando a AuthService
	try {
		const supabase = createSupabaseServerClient({
			headers: request.headers,
			cookies,
		});
		const auth = new AuthService(supabase, cookies);

		await auth.exchangeCodeForSession(code);

		return redirectWithMessage(
			redirect,
			'Sesión iniciada correctamente.',
			'success',
			PATHS.home,
		);
	} catch (error) {
		const message =
			error instanceof AuthError
				? error.message
				: 'Ocurrió un error interno al procesar el inicio de sesión.';
		log.error('Error', { message });
		return redirectWithMessage(redirect, message, 'error', PATHS.signIn);
	}
};
