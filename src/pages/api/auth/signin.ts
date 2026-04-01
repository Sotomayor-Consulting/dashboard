// src/pages/api/auth/signin.ts
// ─── Thin handler: Sign In ──────────────────────────────
export const prerender = false;

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

// Safety net: si algo hace GET a esta ruta, redirigir al formulario
export const GET: APIRoute = async ({ redirect }) => {
	return redirect(PATHS.signIn);
};

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
	const formData = await request.formData();
	const email = formData.get('email')?.toString();
	const password = formData.get('password')?.toString();
	const provider = formData.get('provider')?.toString();
	const remember = formData.has('remember');

	// Si "Recuérdame" NO está marcado, sessionOnly=true hace que las cookies
	// se setean sin maxAge → expiran al cerrar el browser.
	const supabase = createSupabaseServerClient({
		headers: request.headers,
		cookies,
		sessionOnly: !remember,
	});
	const auth = new AuthService(supabase, cookies);

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
