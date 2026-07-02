// ─── Thin handler: Forgot Password ─────────────────────
export const prerender = false;

import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '@infrastructure/supabase';
import {
	AuthService,
	PATHS,
	buildOAuthRedirectUrl,
	jsonError,
	jsonSuccess,
	redirectWithMessage,
} from '@infrastructure/auth';
import { safeBack } from '@infrastructure/security/headers';

const wantsJson = (request: Request) =>
	(request.headers.get('accept') ?? '').includes('application/json');

export const POST: APIRoute = async ({ request, cookies, redirect, url }) => {
	const back = safeBack(url.searchParams.get('back'), PATHS.forgotPassword);

	try {
		const form = await request.formData();
		const email = form.get('email')?.toString().trim() ?? '';

		if (!email) {
			if (wantsJson(request)) {
				return jsonError('El email es requerido.', 400);
			}

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

		const redirectTo = buildOAuthRedirectUrl(
			request,
			'/api/auth/recovery-callback',
		);
		await auth.forgotPassword({ email, redirectTo });

		if (wantsJson(request)) {
			return jsonSuccess({
				message:
					'Si el email está registrado, recibirás un enlace para restablecer tu contraseña.',
			});
		}

		// Siempre responder lo mismo por seguridad (no revelar si el email existe)
		return redirectWithMessage(
			redirect,
			'Si el email está registrado, recibirás un enlace para restablecer tu contraseña.',
			'success',
			back,
		);
	} catch {
		if (wantsJson(request)) {
			return jsonError('Error inesperado. Inténtalo nuevamente.', 500);
		}

		return redirectWithMessage(
			redirect,
			'Error inesperado. Inténtalo nuevamente.',
			'error',
			back,
		);
	}
};

export const GET: APIRoute = async ({ redirect, url }) => {
	const back = safeBack(url.searchParams.get('back'), PATHS.forgotPassword);
	return redirectWithMessage(
		redirect,
		'Usa el formulario para solicitar recuperación de contraseña.',
		'info',
		back,
	);
};
