// src/pages/api/auth/forgot-password.ts
// ─── Thin handler: Forgot Password ─────────────────────
export const prerender = false;

import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '@lib/supabase';
import { AuthService, PATHS, redirectWithMessage } from '@lib/auth';
import { safeBack } from '@lib/security/headers';

export const POST: APIRoute = async ({ request, cookies, redirect, url }) => {
	const back = safeBack(url.searchParams.get('back'), PATHS.signIn);

	try {
		const form = await request.formData();
		const email = form.get('email')?.toString().trim() ?? '';

		if (!email) {
			return redirectWithMessage(
				redirect,
				'El email es requerido.',
				'error',
				back,
			);
		}

		const supabase = createSupabaseServerClient({
			headers: request.headers,
			cookies,
		});
		const auth = new AuthService(supabase, cookies);

		const redirectTo = `${url.origin}${PATHS.resetPassword}`;
		await auth.forgotPassword({ email, redirectTo });

		// Siempre responder lo mismo por seguridad (no revelar si el email existe)
		return redirectWithMessage(
			redirect,
			'Si el email está registrado, recibirás un enlace para restablecer tu contraseña.',
			'success',
			back,
		);
	} catch {
		return redirectWithMessage(
			redirect,
			'Error inesperado. Inténtalo nuevamente.',
			'error',
			back,
		);
	}
};

export const GET: APIRoute = async ({ redirect, url }) => {
	const back = safeBack(url.searchParams.get('back'), PATHS.signIn);
	return redirectWithMessage(
		redirect,
		'Usa el formulario para solicitar recuperación de contraseña.',
		'info',
		back,
	);
};
