// ─── Thin handler: Register (start flow) ────────────────
export const prerender = false;

import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '@infrastructure/supabase';
import {
	AuthService,
	AuthError,
	PATHS,
	buildOAuthRedirectUrl,
	jsonError,
	jsonSuccess,
} from '@infrastructure/auth';
import { safeBack } from '@infrastructure/security/headers';

export const POST: APIRoute = async ({ request, cookies, url }) => {
	try {
		const form = await request.formData();
		const next = safeBack(
			form.get('next')?.toString() ?? url.searchParams.get('next'),
			'/start',
		);
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
		const emailRedirectToUrl = new URL(
			buildOAuthRedirectUrl(request, PATHS.confirmEmail),
		);
		emailRedirectToUrl.searchParams.set('next', next);

		const result = await auth.register({
			email,
			password,
			name,
			lastName,
			emailRedirectTo: emailRedirectToUrl.toString(),
		});

		if (!result.requiresEmailConfirmation) {
			return jsonSuccess({
				requiresEmailConfirmation: false,
				message: 'Cuenta creada correctamente.',
				redirect: next,
			});
		}

		return jsonSuccess({
			requiresEmailConfirmation: true,
			message: 'Revisa tu email para confirmar.',
			redirect: next,
		});
	} catch (error) {
		const message =
			error instanceof AuthError ? error.message : 'Error inesperado.';
		return jsonError(message, 400);
	}
};
