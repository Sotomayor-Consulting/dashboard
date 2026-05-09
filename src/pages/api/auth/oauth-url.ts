// src/pages/api/auth/oauth-url.ts
// ─── Thin handler: Get OAuth URL (JSON) ─────────────────
export const prerender = false;

import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '@infrastructure/supabase';
import { AuthService, AuthError, jsonSuccess, jsonError } from '@infrastructure/auth';
import type { OAuthProvider } from '@infrastructure/auth';

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

		const origin = new URL(request.url).origin;
		const result = await auth.signInWithOAuth(
			provider as OAuthProvider,
			`${origin}/api/auth/callback_start`,
		);

		return jsonSuccess({ url: result.url });
	} catch (error) {
		if (error instanceof AuthError) {
			return jsonError(error.message, 400);
		}
		return jsonError('Error interno del servidor.', 500);
	}
};
