// src/pages/api/auth/register_start.ts
// ─── Thin handler: Register (start flow) ────────────────
export const prerender = false;

import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '@lib/supabase';
import { AuthService, AuthError, redirectWithMessage } from '@lib/auth';

const BACK_PATH = '/start';

export const POST: APIRoute = async ({ request, cookies, redirect, url }) => {
	const back = url.searchParams.get('back') ?? BACK_PATH;

	try {
		const form = await request.formData();
		const name = form.get('name')?.toString().trim() ?? '';
		const lastName = form.get('last-name')?.toString().trim() ?? '';
		const email = form.get('email')?.toString().trim() ?? '';
		const password = form.get('password')?.toString().trim() ?? '';
		const confirmPassword =
			form.get('confirm-password')?.toString().trim() ?? '';

		if (password !== confirmPassword) {
			return redirectWithMessage(
				redirect,
				'Las contraseñas no coinciden. Por favor, verifica e intena de nuevo. ',
				'error',
				back,
			);
		}

		const supabase = createSupabaseServerClient({
			headers: request.headers,
			cookies,
		});
		const auth = new AuthService(supabase, cookies);

		const result = await auth.register({ email, password, name, lastName });

		// Si tiene sesión directa (sin confirmación email), redirigir al home
		if (!result.requiresEmailConfirmation) {
			return redirect('/');
		}

		return redirectWithMessage(
			redirect,
			'Revisa tu email para confirmar.',
			'success',
			back,
		);
	} catch (error) {
		const message =
			error instanceof AuthError ? error.message : 'Error inesperado.';
		return redirectWithMessage(redirect, message, 'error', back);
	}
};
