// src/pages/api/auth/reset-password.ts
// ─── Thin handler: Reset Password ───────────────────────
// Establece una nueva contraseña tras recibir el link de recuperación.
import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '@lib/supabase';
import { AuthService, AuthError, PATHS, redirectWithMessage } from '@lib/auth';

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
	const supabase = createSupabaseServerClient({
		headers: request.headers,
		cookies,
	});
	const auth = new AuthService(supabase, cookies);

	const formData = await request.formData();
	const password = formData.get('password')?.toString() ?? '';
	const confirmPassword =
		formData.get('confirm-password')?.toString() ?? '';

	if (!password) {
		return redirectWithMessage(
			redirect,
			'La contraseña es obligatoria.',
			'error',
			PATHS.resetPassword,
		);
	}

	if (password !== confirmPassword) {
		return redirectWithMessage(
			redirect,
			'Las contraseñas no coinciden. Verifica e intenta de nuevo.',
			'error',
			PATHS.resetPassword,
		);
	}

	try {
		await auth.resetPassword(password);

		return redirectWithMessage(
			redirect,
			'Contraseña actualizada correctamente. Ya puedes iniciar sesión.',
			'success',
			PATHS.signIn,
		);
	} catch (error) {
		const message =
			error instanceof AuthError
				? error.message
				: 'Ocurrió un error inesperado. Intenta de nuevo.';
		return redirectWithMessage(
			redirect,
			message,
			'error',
			PATHS.resetPassword,
		);
	}
};
