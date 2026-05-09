// src/pages/api/auth/token.ts
// ─── Thin handler: Get Access Token ─────────────────────
// Devuelve el access token para uso en APIs externas (SurveyJS, etc.)
export const prerender = false;

import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '@infrastructure/supabase';
import { AuthService, jsonSuccess, jsonError } from '@infrastructure/auth';

export const POST: APIRoute = async ({ request, cookies }) => {
	// Validar que el request venga del mismo origen (comparación estricta)
	const origin = request.headers.get('origin');
	const host = request.headers.get('host');
	if (origin && host) {
		try {
			const originHost = new URL(origin).host;
			if (originHost !== host) {
				return jsonError('Origen no permitido', 403);
			}
		} catch {
			return jsonError('Origen no permitido', 403);
		}
	}

	const supabase = createSupabaseServerClient({
		headers: request.headers,
		cookies,
	});
	const auth = new AuthService(supabase, cookies);

	const accessToken = await auth.getAccessToken();

	if (!accessToken) {
		return jsonError('No autenticado', 401);
	}

	return jsonSuccess({ access_token: accessToken });
};
