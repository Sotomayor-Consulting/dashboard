// src/pages/api/auth/reset-password.ts
// ─── Thin handler: Reset Password ───────────────────────
// Establece una nueva contraseña tras recibir el link de recuperación.
export const prerender = false;

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

		// Si el usuario viene de una invitación Odoo y aún no ha completado
		// los datos de su empresa (tipo_de_negocio NULL en una fila source='odoo'),
		// redirigir al onboarding antes de soltarlo en el dashboard.
		const {
			data: { user },
		} = await supabase.auth.getUser();
		if (user) {
			const { data: pendingEmpresa } = await supabase
				.from('empresas_incorporaciones')
				.select('empresa_incorporacion_id')
				.eq('user_id', user.id)
				.eq('source', 'odoo')
				.is('tipo_de_negocio', null)
				.limit(1)
				.maybeSingle();
			if (pendingEmpresa) {
				return redirect(PATHS.onboarding);
			}
		}

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
