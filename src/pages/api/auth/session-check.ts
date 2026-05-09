// ─── Thin handler: Session Check ────────────────────────
export const prerender = false;

import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '@infrastructure/supabase';
import { AuthService, jsonSuccess, jsonError } from '@infrastructure/auth';

export const GET: APIRoute = async ({ request, cookies }) => {
	try {
		const supabase = createSupabaseServerClient({
			headers: request.headers,
			cookies,
		});
		const auth = new AuthService(supabase, cookies);

		const { isAuthenticated, user } = await auth.checkSession();

		return jsonSuccess({ isAuthenticated, user: user ?? null });
	} catch (error) {
		return jsonError('Error al verificar sesión.', 500);
	}
};
