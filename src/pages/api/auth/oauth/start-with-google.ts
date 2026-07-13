// ─── Thin handler: Start with Google (preserva business data) ─
export const prerender = false;

import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '@infrastructure/supabase';
import { AuthService, AuthError } from '@infrastructure/auth';

export const POST: APIRoute = async ({ request, cookies, redirect, url }) => {
	// Preservar datos de negocio en cookie temporal para el callback
	const businessData = cookies.get('business_data')?.value;
	if (businessData) {
		cookies.set('oauth_business_data', businessData, {
			path: '/',
			maxAge: 60 * 30,
			httpOnly: true,
			secure: import.meta.env.PROD,
		});
	}

	try {
		const supabase = createSupabaseServerClient({
			headers: request.headers,
			cookies,
		});
		const auth = new AuthService(supabase, cookies);

		const result = await auth.signInWithOAuth(
			'google',
			`${url.origin}/api/auth/oauth/callback-start`,
		);

		return redirect(result.url);
	} catch (error) {
		const message =
			error instanceof AuthError ? error.message : 'Error inesperado.';
		return new Response(message, { status: 500 });
	}
};
