// src/pages/api/auth/register.ts
import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';

/**
 * Helper para redirigir con mensaje
 */
function redirectWithMessage(
	redirectFn: (
		path: string,
		status?: 301 | 302 | 303 | 307 | 308 | 300 | 304 | undefined,
	) => Response,
	msg: string,
	statusType: 'success' | 'error' = 'error',
	destination: string = '/sign-up', // Por defecto redirige a sign-up
) {
	const params = new URLSearchParams({
		status: statusType,
		msg,
	});

	return redirectFn(`${destination}?${params.toString()}`);
}

export const POST: APIRoute = async ({ request, redirect }) => {
	const formData = await request.formData();
	const email = formData.get('email')?.toString().trim();
	const password = formData.get('password')?.toString();
	const name = formData.get('name')?.toString().trim();
	const lastName = formData.get('last-name')?.toString().trim();

	// Validaciones básicas
	if (!email || !password) {
		return redirectWithMessage(
			redirect,
			'Correo electrónico y contraseña son obligatorios.',
		);
	}

	// Validación de formato de email
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	if (!emailRegex.test(email)) {
		return redirectWithMessage(
			redirect,
			'Por favor, introduce un correo electrónico válido.',
		);
	}

	// Validación de fortaleza de contraseña (mínimo 6 caracteres)
	if (password.length < 6) {
		return redirectWithMessage(
			redirect,
			'La contraseña debe tener al menos 6 caracteres.',
		);
	}

	try {
		const { data, error } = await supabase.auth.signUp({
			email,
			password,
			options: {
				data: {
					name,
					lastName,
				},
				emailRedirectTo: `${new URL(request.url).origin}/api/auth/callback`,
			},
		});

		if (error) {
			console.error('[register] Error:', error.message);

			// Mensajes más amigables para errores comunes
			let userMessage = 'Ocurrió un error al registrar la cuenta.';

			if (
				error.message.includes('already registered') ||
				error.code === 'user_already_exists'
			) {
				userMessage =
					'Este correo electrónico ya está registrado. ¿Olvidaste tu contraseña?';
			} else if (
				error.message.includes('password') ||
				error.code === 'weak_password'
			) {
				userMessage =
					'La contraseña no cumple con los requisitos de seguridad.';
			} else if (
				error.message.includes('email') ||
				error.code === 'invalid_email'
			) {
				userMessage = 'El correo electrónico no es válido.';
			} else if (error.message.includes('rate limit')) {
				userMessage = 'Demasiados intentos. Por favor, espera unos minutos.';
			}

			return redirectWithMessage(redirect, userMessage);
		}

		// Verificar si se requiere confirmación por email
		if (data?.user?.identities?.length === 0) {
			return redirectWithMessage(
				redirect,
				'Este correo electrónico ya está registrado. Por favor, inicia sesión.',
				'error',
				'/sign-in',
			);
		}

		// Éxito - redirigir a sign-in con mensaje de éxito
		return redirectWithMessage(
			redirect,
			data.session
				? '¡Registro exitoso! Bienvenido/a. Por favor, inicia sesión'
				: '¡Registro exitoso! Por favor, inicia sesión',
			'success',
			'/sign-in',
		);
	} catch (error) {
		console.error('[register] Error inesperado:', error);
		return redirectWithMessage(
			redirect,
			'Ocurrió un error inesperado. Por favor, intenta de nuevo más tarde.',
		);
	}
};
