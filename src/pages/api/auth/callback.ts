// src/pages/api/auth/callback.ts
// ─── Thin handler: OAuth Callback ───────────────────────
import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '@lib/supabase';
import { AuthService, AuthError, PATHS, redirectWithMessage } from '@lib/auth';

export const GET: APIRoute = async ({ url, request, cookies, redirect }) => {
	// 1) Error de OAuth (usuario cancela, etc.)
	const oauthError = url.searchParams.get('error');
	const oauthErrorDescription = url.searchParams.get('error_description');

	if (oauthError) {
		console.error('[callback] OAuth error:', oauthError, oauthErrorDescription);
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

	// Intentaremos intercambiar código por sesión con Supabase
	console.log('[callback] Intentando exchangeCodeForSession con Supabase...');

	// Hacemos hasta 2 intentos si hay errores relacionados con PKCE por condiciones de carrera
	const MAX_ATTEMPTS = 2;
	for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
		try {
			console.log(`[callback] exchangeCodeForSession attempt ${attempt}`);
			const { data, error } =
				await supabase.auth.exchangeCodeForSession(authCode);

			console.log('[callback] Resultado exchange -> error:', error);
			console.log(
				'[callback] Resultado exchange -> data.session existe?:',
				!!data?.session,
			);

			if (error || !data?.session) {
				// Inspeccionamos mensajes comunes para dar mejor feedback
				const errMsg =
					(error && (error.message || JSON.stringify(error))) ||
					'Unknown error';
				console.warn('[callback] exchangeCodeForSession failed:', errMsg);

				// Si es un error PKCE/state podemos intentar un retry breve
				const pkceErrors = [
					'code challenge does not match previously saved code verifier',
					'bad_code_verifier',
					'OAuth callback with invalid state',
					'token is expired',
				];
				const lower = (errMsg || '').toLowerCase();
				const isPkceStateError = pkceErrors.some((p) => lower.includes(p));

				if (isPkceStateError && attempt < MAX_ATTEMPTS) {
					console.log(
						'[callback] Detectado error PKCE/state. Esperando 300ms y reintentando...',
					);
					await new Promise((res) => setTimeout(res, 300));
					continue;
				}

				// Si no es recuperable aquí, devolvemos error visible al usuario y logs
				console.error('[callback] Error irrecoverable en exchange:', errMsg);
				return redirectWithMessage(
					redirect,
					'No se pudo completar el inicio de sesión con Google. Inténtalo nuevamente.',
					'error',
				);
			}

			// Si llegamos aquí, tenemos sesión válida
			const { access_token, refresh_token } = data.session as {
				access_token?: string;
				refresh_token?: string;
			};

			console.log('[callback] Sesión obtenida de Supabase.');
			if (access_token) {
				console.log(
					'[callback] access_token (primeros 15 chars):',
					access_token.slice(0, 15) + '...',
				);
			}
			if (refresh_token) {
				console.log(
					'[callback] refresh_token (primeros 15 chars):',
					refresh_token.slice(0, 15) + '...',
				);
			}

			// Seteamos cookies con flags seguros - IMPORTANT: SameSite=None requiere HTTPS
			const cookieOpts = {
				path: '/',
				secure: true,
				httpOnly: false, // si quieres que el cliente pueda leer tokens, poner false; con supabase suele usarse client-side
				sameSite: 'none' as const,
				maxAge: 60 * 60 * 24 * 30, // 30 días
			};

			console.log(
				'[callback] Seteando cookies sb-access-token y sb-refresh-token...',
			);
			if (access_token) {
				cookies.set('sb-access-token', access_token, cookieOpts);
			}
			if (refresh_token) {
				cookies.set('sb-refresh-token', refresh_token, cookieOpts);
			}

			console.log(
				'[callback] Cookies seteadas correctamente. Redirigiendo al home...',
			);
			console.log('========== [callback] FIN (SUCCESS) ==========');

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
		return redirectWithMessage(redirect, message, 'error', PATHS.signIn);
	}
};
