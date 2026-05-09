// src/pages/api/auth/register-start.ts
// ─── Thin handler: Register (start flow) ────────────────
export const prerender = false;

import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '@infrastructure/supabase';
import { AuthService, AuthError, jsonError, jsonSuccess } from '@infrastructure/auth';

export const POST: APIRoute = async ({ request, cookies }) => {
	try {
		const form = await request.formData();
		const name = form.get('name')?.toString().trim() ?? '';
		const lastName = form.get('last-name')?.toString().trim() ?? '';
		const email = form.get('email')?.toString().trim() ?? '';
		const password = form.get('password')?.toString() ?? '';
		const confirmPassword =
			form.get('confirm-password')?.toString() ?? '';

		if (password !== confirmPassword) {
			return jsonError(
				'Las contraseñas no coinciden. Por favor, verifica e intenta de nuevo.',
				400,
			);
		}

		const supabase = createSupabaseServerClient({
			headers: request.headers,
			cookies,
		});
		const auth = new AuthService(supabase, cookies);

		const result = await auth.register({ email, password, name, lastName });

		if (!result.requiresEmailConfirmation) {
			return jsonSuccess({
				requiresEmailConfirmation: false,
				message: 'Cuenta creada correctamente.',
			});
		}

		return jsonSuccess({
			requiresEmailConfirmation: true,
			message: 'Revisa tu email para confirmar.',
		});
	} catch (error) {
		const message =
			error instanceof AuthError ? error.message : 'Error inesperado.';
		return jsonError(message, 400);
	}
};
