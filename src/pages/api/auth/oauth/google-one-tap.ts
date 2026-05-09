// src/pages/api/auth/oauth/google-one-tap.ts
// ─── Google One Tap: recibe ID token y crea sesión ──────
export const prerender = false;

import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '@infrastructure/supabase';
import { jsonSuccess, jsonError } from '@infrastructure/auth';

export const POST: APIRoute = async ({ request, cookies }) => {
	try {
		const { credential, nonce } = (await request.json()) as {
			credential?: string;
			nonce?: string;
		};

		if (!credential) {
			return jsonError('Token de Google no proporcionado.', 400);
		}

		const supabase = createSupabaseServerClient({
			headers: request.headers,
			cookies,
		});

		const { data, error } = await supabase.auth.signInWithIdToken({
			provider: 'google',
			token: credential,
			...(nonce ? { nonce } : {}),
		});

		if (error || !data.session) {
			console.error('[google-one-tap] Error:', {
				message: error?.message,
				code: (error as any)?.code,
				status: (error as any)?.status,
			});
			return jsonError(
				error?.message ?? 'No se pudo iniciar sesión con Google. Inténtalo nuevamente.',
				400,
			);
		}

		return jsonSuccess({ user: data.user?.email });
	} catch (error) {
		console.error('[google-one-tap] Error interno:', error);
		return jsonError('Error interno del servidor.', 500);
	}
};
