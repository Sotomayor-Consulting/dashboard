// ─── Thin handler: Register ─────────────────────────────
export const prerender = false;

import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '@infrastructure/supabase';
import {
	AuthService,
	AuthError,
	PATHS,
	redirectWithMessage,
	buildOAuthRedirectUrl,
	jsonSuccess,
	jsonError,
} from '@infrastructure/auth';
import { TURNSTILE_SECRET_KEY } from 'astro:env/server';

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
	const wantsJson = request.headers
		.get('Accept')
		?.includes('application/json');

	const supabase = createSupabaseServerClient({
		headers: request.headers,
		cookies,
	});
	const auth = new AuthService(supabase, cookies);
	const emailRedirectTo = buildOAuthRedirectUrl(request, PATHS.confirmEmail);

	const formData = await request.formData();
	const email = formData.get('email')?.toString().trim() ?? '';
	const password = formData.get('password')?.toString() ?? '';
	const confirmPassword = formData.get('confirm-password')?.toString() ?? '';
	const name = formData.get('name')?.toString().trim() ?? '';
	const lastName = formData.get('last-name')?.toString().trim() ?? '';
	const turnstileToken = formData.get('cf-turnstile-response')?.toString();

	// ─── Turnstile verification ──────────────────────
	const turnstileSecret = TURNSTILE_SECRET_KEY;
	if (turnstileSecret) {
		if (!turnstileToken) {
			return redirectWithMessage(
				redirect,
				'Verificación de seguridad requerida.',
				'error',
				PATHS.signUp,
			);
		}

		const verifyBody = new URLSearchParams();
		verifyBody.set('secret', turnstileSecret);
		verifyBody.set('response', turnstileToken);

		const verifyRes = await fetch(
			'https://challenges.cloudflare.com/turnstile/v0/siteverify',
			{ method: 'POST', body: verifyBody },
		);
		const verifyData = (await verifyRes.json()) as { success: boolean };
		if (!verifyData.success) {
			return redirectWithMessage(
				redirect,
				'Verificación de seguridad fallida. Intenta de nuevo.',
				'error',
				PATHS.signUp,
			);
		}
	}

	if (password !== confirmPassword) {
		if (wantsJson) {
			return jsonError(
				'Las contraseñas no coinciden. Por favor, verifica e intenta de nuevo.',
				400,
			);
		}

		return redirectWithMessage(
			redirect,
			'Las contraseñas no coinciden. Por favor, verifica e intenta de nuevo. ',
			'error',
			PATHS.signUp,
		);
	}

	try {
		const result = await auth.register({
			email,
			password,
			name,
			lastName,
			emailRedirectTo,
		});

		if (result.requiresEmailConfirmation) {
			if (wantsJson) {
				return jsonSuccess({
					requiresEmailConfirmation: true,
					message:
						'¡Registro exitoso! Revisa tu correo para confirmar tu cuenta.',
					redirect: PATHS.signIn,
				});
			}

			return redirectWithMessage(
				redirect,
				'¡Registro exitoso! Revisa tu correo para confirmar tu cuenta.',
				'success',
				PATHS.signIn,
			);
		}

		if (wantsJson) {
			return jsonSuccess({
				requiresEmailConfirmation: false,
				message: '¡Registro exitoso! Bienvenido/a.',
				redirect: PATHS.home,
			});
		}

		return redirectWithMessage(
			redirect,
			'¡Registro exitoso! Bienvenido/a.',
			'success',
			PATHS.signIn,
		);
	} catch (error) {
		const message =
			error instanceof AuthError
				? error.message
				: 'Ocurrió un error inesperado. Intenta de nuevo.';

		if (wantsJson) {
			return jsonError(message, 400);
		}

		return redirectWithMessage(redirect, message, 'error', PATHS.signUp);
	}
};
