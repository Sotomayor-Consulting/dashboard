// src/pages/api/auth/token.ts
// ─── Thin handler: Get Access Token ─────────────────────
// Devuelve el access token para uso en APIs externas (SurveyJS, etc.)
import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '@lib/supabase';
import { AuthService, jsonSuccess, jsonError } from '@lib/auth';

export const GET: APIRoute = async ({ request, cookies }) => {
	const supabase = createSupabaseServerClient({
		headers: request.headers,
		cookies,
	});
	const auth = new AuthService(supabase, cookies);

	const accessToken = auth.getAccessToken();

	if (!accessToken) {
		return jsonError('No autenticado', 401);
	}

	return jsonSuccess({ access_token: accessToken });
};
