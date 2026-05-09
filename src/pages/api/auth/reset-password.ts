// src/pages/api/auth/reset-password.ts
// ─── Thin handler: Reset Password ───────────────────────
// Establece una nueva contraseña tras recibir el link de recuperación.
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

		// Si el usuario viene de una invitación Odoo, redirigir al onboarding.
		// Detectamos el origen desde raw_user_meta_data.source porque la fila
		// en empresas_incorporaciones puede no existir aún si la RPC
		// procesar_orden_odoo falló (ej: producto no mapeado en servicios).
		// El onboarding se encarga de crear el stub si hace falta.
		const {
			data: { user },
		} = await supabase.auth.getUser();
		const isOdooUser =
			user?.user_metadata?.source === 'odoo' ||
			user?.app_metadata?.source === 'odoo';
		if (user && isOdooUser) {
			const { data: completedEmpresa } = await supabase
				.from('empresas_incorporaciones')
				.select('empresa_incorporacion_id')
				.eq('user_id', user.id)
				.eq('source', 'odoo')
				.not('tipo_de_negocio', 'is', null)
				.limit(1)
				.maybeSingle();
			if (!completedEmpresa) {
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
