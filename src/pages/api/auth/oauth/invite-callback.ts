// src/pages/api/auth/oauth/invite-callback.ts
// ─── Thin handler: Invite Callback ──────────────────────
// Acepta dos formas de invite:
//  1) PKCE: ?code=...   → exchangeCodeForSession
//  2) OTP:  ?token_hash=...&type=invite → verifyOtp
export const prerender = false;

import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '@infrastructure/supabase';
import { AuthService, AuthError } from '@infrastructure/auth';

export const GET: APIRoute = async ({ url, request, cookies, redirect }) => {
	const code = url.searchParams.get('code') ?? undefined;
	const tokenHash = url.searchParams.get('token_hash') ?? undefined;
	const token = url.searchParams.get('token') ?? undefined;
	const type = url.searchParams.get('type') ?? undefined;

	try {
		const supabase = createSupabaseServerClient({
			headers: request.headers,
			cookies,
		});

		// Caso 1: PKCE (link con ?code=)
		if (code) {
			const auth = new AuthService(supabase, cookies);
			await auth.handleInviteCallback({ code, token });
			return redirect('/set-password');
		}

		// Caso 2: OTP por token_hash (recomendado para invite por email)
		if (tokenHash) {
			const { error } = await supabase.auth.verifyOtp({
				type: (type as any) ?? 'invite',
				token_hash: tokenHash,
			});
			if (error) {
				return new Response(
					`Error al validar invitación: ${error.message}`,
					{ status: 400 },
				);
			}
			return redirect('/set-password');
		}

		return new Response(
			"Parámetros inválidos: se requiere 'code' o 'token_hash'.",
			{ status: 400 },
		);
	} catch (error) {
		const message =
			error instanceof AuthError
				? error.message
				: 'Error al procesar invitación.';
		return new Response(message, { status: 400 });
	}
};
