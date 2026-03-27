// src/pages/api/auth/session-check.ts
// ─── Thin handler: Session Check ────────────────────────
import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '@lib/supabase';
import { AuthService, jsonSuccess, jsonError } from '@lib/auth';

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
