// src/pages/api/auth/signout.ts
// ─── Thin handler: Sign Out ─────────────────────────────
import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '@lib/supabase';
import { AuthService, PATHS } from '@lib/auth';

export const GET: APIRoute = async ({ request, cookies, redirect }) => {
	const supabase = createSupabaseServerClient({
		headers: request.headers,
		cookies,
	});
	const auth = new AuthService(supabase, cookies);

	await auth.signOut();

	return redirect(PATHS.signIn);
};
