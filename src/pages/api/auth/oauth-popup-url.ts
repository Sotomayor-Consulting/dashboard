// src/pages/api/auth/oauth-popup-url.ts
// ─── Get OAuth URL for Popup Flow ─────────────────────
export const prerender = false;

import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '@lib/supabase';
import { AuthService, AuthError, jsonSuccess, jsonError } from '@lib/auth';
import type { OAuthProvider } from '@lib/auth';

export const POST: APIRoute = async ({ request, cookies, url }) => {
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

		const redirectTo = `${url.origin}/api/auth/callback-popup`;
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
