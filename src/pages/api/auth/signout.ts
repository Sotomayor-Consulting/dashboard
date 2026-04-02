// src/pages/api/auth/signout.ts
// ─── Thin handler: Sign Out ─────────────────────────────
export const prerender = false;

import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '@lib/supabase';
import { AuthService, PATHS } from '@lib/auth';
import type { SupabaseClient } from '@supabase/supabase-js';

// GET: prefetch de Astro o navegación directa → redirigir al sign-in
export const GET: APIRoute = async ({ redirect }) => {
	return redirect(PATHS.signIn);
};

export const POST: APIRoute = async ({ request, cookies, redirect, locals }) => {
	const supabase =
		(locals.supabase as SupabaseClient | undefined) ??
		createSupabaseServerClient({
			headers: request.headers,
			cookies,
		});
	const auth = new AuthService(supabase, cookies);

	await auth.signOut();

	return redirect(PATHS.signIn);
};
