export const prerender = false;

import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '@infrastructure/supabase';
import {
	AuthError,
	AuthService,
	PATHS,
	redirectWithMessage,
} from '@infrastructure/auth';

export const GET: APIRoute = async ({ url, request, cookies, redirect }) => {
	const code = url.searchParams.get('code') ?? undefined;
	const tokenHash = url.searchParams.get('token_hash') ?? undefined;
	const type = url.searchParams.get('type') ?? undefined;

	try {
		const supabase = createSupabaseServerClient({
			headers: request.headers,
			cookies,
		});
		const auth = new AuthService(supabase, cookies);

		if (code) {
			await auth.exchangeCodeForSession(code);
			return redirectWithMessage(
				redirect,
				'Cuenta confirmada correctamente. Bienvenido/a.',
				'success',
				PATHS.home,
			);
		}

		if (tokenHash) {
			const { error } = await supabase.auth.verifyOtp({
				type: (type as 'signup' | undefined) ?? 'signup',
				token_hash: tokenHash,
			});

			if (error) {
				throw new AuthError('No se pudo validar el enlace de confirmación.');
			}

			return redirectWithMessage(
				redirect,
				'Cuenta confirmada correctamente. Bienvenido/a.',
				'success',
				PATHS.home,
			);
		}

		return redirectWithMessage(
			redirect,
			'El enlace de confirmación no es válido o ya expiró.',
			'error',
			PATHS.signIn,
		);
	} catch (error) {
		const message =
			error instanceof AuthError
				? error.message
				: 'No se pudo procesar la confirmación de tu cuenta.';

		return redirectWithMessage(redirect, message, 'error', PATHS.signIn);
	}
};
