// src/pages/api/auth/register.ts
// ─── Thin handler: Register ─────────────────────────────
export const prerender = false;

import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '@infrastructure/supabase';
import { AuthService, AuthError, PATHS, redirectWithMessage } from '@infrastructure/auth';

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
	const supabase = createSupabaseServerClient({
		headers: request.headers,
		cookies,
	});
	const auth = new AuthService(supabase, cookies);

	const formData = await request.formData();
	const email = formData.get('email')?.toString().trim() ?? '';
	const password = formData.get('password')?.toString() ?? '';
	const confirmPassword = formData.get('confirm-password')?.toString() ?? '';
	const name = formData.get('name')?.toString().trim() ?? '';
	const lastName = formData.get('last-name')?.toString().trim() ?? '';

	if (password !== confirmPassword) {
		return redirectWithMessage(
			redirect,
			'Las contraseñas no coinciden. Por favor, verifica e intenta de nuevo. ',
			'error',
			PATHS.signUp,
		);
	}

	try {
		const result = await auth.register({ email, password, name, lastName });

		if (result.requiresEmailConfirmation) {
			return redirectWithMessage(
				redirect,
				'¡Registro exitoso! Revisa tu correo para confirmar tu cuenta.',
				'success',
				PATHS.signIn,
			);
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
		return redirectWithMessage(redirect, message, 'error', PATHS.signUp);
	}
};
