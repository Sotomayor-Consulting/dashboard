// ─── Thin handler: Reset Password ───────────────────────
// Establece una nueva contraseña tras recibir el link de recuperación.
export const prerender = false;

import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '@infrastructure/supabase';
import { createLogger } from '@infrastructure/logging';
import {
	AuthService,
	AuthError,
	PATHS,
	buildMessageUrl,
	jsonError,
	jsonSuccess,
} from '@infrastructure/auth';

const log = createLogger('auth.reset-password');
const wantsJson = (request: Request) =>
	(request.headers.get('accept') ?? '').includes('application/json');

const seeOther = (
	message: string,
	status: 'success' | 'error' | 'info',
	destination: string,
) => {
	const location = buildMessageUrl(destination, message, status);
	log.info('redirecting reset password', { destination: location, status });

	return new Response(null, {
		status: 303,
		headers: {
			Location: location,
		},
	});
};

export const POST: APIRoute = async ({ request, cookies }) => {
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
		if (wantsJson(request)) {
			return jsonError('La contraseña es obligatoria.', 400);
		}

		return seeOther(
			'La contraseña es obligatoria.',
			'error',
			PATHS.resetPassword,
		);
	}

	if (password !== confirmPassword) {
		if (wantsJson(request)) {
			return jsonError(
				'Las contraseñas no coinciden. Verifica e intenta de nuevo.',
				400,
			);
		}

		return seeOther(
			'Las contraseñas no coinciden. Verifica e intenta de nuevo.',
			'error',
			PATHS.resetPassword,
		);
	}

	try {
		log.info('processing password reset');
		await auth.resetPassword(password);
		log.info('password reset succeeded');

		// Si el usuario viene de una invitación Odoo, redirigir al onboarding.
		// Detectamos el origen desde raw_user_meta_data.source porque la fila
		// en incorporations puede no existir aún si la RPC
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
				.from('incorporations')
				.select('id')
				.eq('user_id', user.id)
				.eq('source', 'odoo')
				.not('tipo_de_negocio', 'is', null)
				.limit(1)
				.maybeSingle();
			if (!completedEmpresa) {
				log.info('redirecting odoo user to onboarding');
				if (wantsJson(request)) {
					return jsonSuccess({ redirectTo: PATHS.onboarding });
				}

				return new Response(null, {
					status: 303,
					headers: {
						Location: PATHS.onboarding,
					},
				});
			}
		}

		const successRedirect = buildMessageUrl(
			PATHS.signIn,
			'Contraseña actualizada correctamente. Ya puedes iniciar sesión.',
			'success',
		);

		if (wantsJson(request)) {
			log.info('returning json success for reset password', {
				destination: successRedirect,
			});
			return jsonSuccess({ redirectTo: successRedirect });
		}

		return seeOther(
			'Contraseña actualizada correctamente. Ya puedes iniciar sesión.',
			'success',
			PATHS.signIn,
		);
	} catch (error) {
		const message =
			error instanceof AuthError
				? error.message
				: 'Ocurrió un error inesperado. Intenta de nuevo.';
		log.error('password reset failed', {
			message,
			error,
		});

		if (wantsJson(request)) {
			return jsonError(message, 400);
		}

		return seeOther(
			message,
			'error',
			PATHS.resetPassword,
		);
	}
};

export const GET: APIRoute = async () => {
	log.warn('unexpected GET on reset-password api');

	return new Response(null, {
		status: 303,
		headers: {
			Location: PATHS.resetPassword,
		},
	});
};
