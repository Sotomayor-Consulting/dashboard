export const prerender = false;

import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '@infrastructure/supabase';
import { AuthError, AuthService, PATHS, redirectWithMessage } from '@infrastructure/auth';

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
			return redirect(PATHS.resetPassword);
		}

		if (tokenHash) {
			const { error } = await supabase.auth.verifyOtp({
				type: (type as 'recovery' | undefined) ?? 'recovery',
				token_hash: tokenHash,
			});

			if (error) {
				throw new AuthError('No se pudo validar el enlace de recuperación.');
			}

			return redirect(PATHS.resetPassword);
		}

		return redirectWithMessage(
			redirect,
			'El enlace de recuperación no es válido o ya expiró.',
			'error',
			PATHS.forgotPassword,
		);
	} catch (error) {
		const message =
			error instanceof AuthError
				? error.message
				: 'No se pudo procesar el enlace de recuperación.';

		return redirectWithMessage(
			redirect,
			message,
			'error',
			PATHS.forgotPassword,
		);
	}
};
