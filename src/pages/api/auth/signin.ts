// src/pages/api/auth/signin.ts
// ─── Thin handler: Sign In ──────────────────────────────
import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '@lib/supabase';
import {
	AuthService,
	AuthError,
	PATHS,
	redirectWithMessage,
	buildOAuthRedirectUrl,
} from '@lib/auth';
import type { OAuthProvider } from '@lib/auth';

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
	const supabase = createSupabaseServerClient({
		headers: request.headers,
		cookies,
	});
	const auth = new AuthService(supabase, cookies);

	const formData = await request.formData();
	const email = formData.get('email')?.toString();
	const password = formData.get('password')?.toString();
	const provider = formData.get('provider')?.toString();

	try {
		// ─── OAuth (Google) ───────────────────────────────
		if (provider) {
			const redirectTo = buildOAuthRedirectUrl(request);
			const result = await auth.signInWithOAuth(
				provider as OAuthProvider,
				redirectTo,
			);
			return redirect(result.url);
		}

		// ─── Email/Password ───────────────────────────────
		await auth.signInWithPassword({
			email: email ?? '',
			password: password ?? '',
		});

		return redirect(PATHS.home);
	} catch (error) {
		const message =
			error instanceof AuthError
				? error.message
				: 'Error inesperado al iniciar sesión.';
		return redirectWithMessage(redirect, message, 'error', PATHS.signIn);
	}
};
