// src/pages/api/auth/oauth-popup-url.ts
// ─── Get OAuth URL for Popup Flow ─────────────────────
export const prerender = false;

import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '@infrastructure/supabase';
import {
	AuthService,
	AuthError,
	jsonSuccess,
	jsonError,
	buildOAuthRedirectUrl,
} from '@infrastructure/auth';
import type { OAuthProvider } from '@infrastructure/auth';

const POPUP_CALLBACK_PATH = '/api/auth/callback-popup';

export const POST: APIRoute = async ({ request, cookies }) => {
	try {
		const { provider } = (await request.json()) as { provider?: string };

		if (!provider) {
			return jsonError('Proveedor no válido.', 400);
		}

		const supabase = createSupabaseServerClient({
			headers: request.headers,
			cookies,
		});
		const auth = new AuthService(supabase, cookies);

		// Usar buildOAuthRedirectUrl para resolver el host correcto detrás del proxy
		const redirectTo = buildOAuthRedirectUrl(request, POPUP_CALLBACK_PATH);
		const result = await auth.signInWithOAuth(
			provider as OAuthProvider,
			redirectTo,
		);

		return jsonSuccess({ url: result.url });
	} catch (error) {
		if (error instanceof AuthError) {
			return jsonError(error.message, 400);
		}
		return jsonError('Error interno del servidor.', 500);
	}
};
