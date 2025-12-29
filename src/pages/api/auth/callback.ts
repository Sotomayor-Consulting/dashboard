import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';

/**
 * Helper para redirigir con mensaje
 */
function redirectWithMessage(
	redirectFn: (
		location: string,
		status?: 301 | 302 | 303 | 307 | 308 | 300 | 304 | undefined,
	) => Response,
	msg: string,
	statusType: 'success' | 'error' = 'error',
	route: string = '/sign-in',
) {
	const params = new URLSearchParams({
		status: statusType,
		msg,
	});

	const finalUrl = `${route}?${params.toString()}`;
	console.log('[callback] redirectWithMessage ->', finalUrl);

	return redirectFn(finalUrl);
}

export const GET: APIRoute = async ({ url, cookies, redirect, request }) => {
	console.log('========== [callback] INICIO ==========');
	console.log('[callback] URL completa:', url.toString());
	console.log(
		'[callback] Query params:',
		Object.fromEntries(url.searchParams.entries()),
	);
	console.log('[callback] Método:', request.method);

	// 0) Log útil para debugging de cookies y origen
	console.log('[callback] Host:', request.headers.get('host'));
	console.log(
		'[callback] X-Forwarded-Proto:',
		request.headers.get('x-forwarded-proto'),
	);

	// 1) Si Google devuelve un error (usuario cancela, etc.)
	const oauthError = url.searchParams.get('error');
	const oauthErrorDescription = url.searchParams.get('error_description');

	if (oauthError) {
		console.error(
			'[callback] Error de OAuth Google:',
			oauthError,
			oauthErrorDescription,
		);

		console.log('[callback] Saliendo por rama de error de OAuth');
		return redirectWithMessage(
			redirect,
			oauthErrorDescription ||
				'No se pudo completar el inicio de sesión con Google. Inténtalo nuevamente.',
			'error',
		);
	}

	console.log('[callback] No hay error de OAuth en query params.');

	// 2) Código de autorización y state (PKCE)
	const authCode = url.searchParams.get('code');
	const state = url.searchParams.get('state');
	console.log('[callback] authCode:', !!authCode);
	console.log('[callback] state:', state);

	if (!authCode) {
		console.warn("[callback] NO se recibió 'code' en la URL");
		return redirectWithMessage(
			redirect,
			'No se proporcionó ningún código de autorización. Vuelve a intentar iniciar sesión.',
			'error',
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
				sameSite: 'None' as const,
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
				'Sesión iniciada correctamente con Google.',
				'success',
				'/', // → "/?status=success&msg=..."
			);
		} catch (err) {
			console.error(
				`[callback] EXCEPCIÓN en exchangeCodeForSession (attempt ${attempt}):`,
				err,
			);

			// Si es el último intento, devolvemos error al usuario
			if (attempt === MAX_ATTEMPTS) {
				console.log('========== [callback] FIN (EXCEPTION) ==========');
				return redirectWithMessage(
					redirect,
					'Ocurrió un error interno al procesar el inicio de sesión. Inténtalo nuevamente.',
					'error',
				);
			}

			// Esperamos y reintentamos
			await new Promise((res) => setTimeout(res, 300));
			continue;
		}
	}

	// Si por alguna razón salimos del loop sin retornar
	return redirectWithMessage(
		redirect,
		'No se pudo completar el inicio de sesión. Inténtalo nuevamente.',
		'error',
	);
};
