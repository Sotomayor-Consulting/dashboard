// ─── Thin handler: Invite Callback ──────────────────────
// Acepta dos formas de invite:
//  1) PKCE: ?code=...   → exchangeCodeForSession
//  2) OTP:  ?token_hash=...&type=invite → verifyOtp
//
// Los enlaces de invitación de Supabase son de UN SOLO USO y expiran según
// "Email OTP Expiration" (Dashboard → Auth → Providers → Email; máx 24h).
//
// UX de re-clic: el primer clic consume el token pero deja una sesión en
// cookies. Si el usuario vuelve a abrir el enlace en el mismo navegador
// (cerró la pestaña, clic doble, etc.), el token falla pero la sesión
// sigue viva → se le deja pasar a /set-password sin error. Solo se muestra
// el estado "enlace no válido" cuando tampoco hay sesión (otro navegador,
// enlace realmente expirado, o consumido por un escáner de emails).
export const prerender = false;

import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '@infrastructure/supabase';
import {
	AuthService,
	AuthError,
	PATHS,
	redirectWithMessage,
} from '@infrastructure/auth';
import { createLogger } from '@infrastructure/logging';

const log = createLogger('invite-callback');

const EXPIRED_MESSAGE =
	'El enlace de invitación expiró o ya fue utilizado. Solicita un nuevo enlace a tu correo desde la opción de abajo.';
const INVALID_MESSAGE =
	'El enlace de invitación no es válido. Solicita un nuevo enlace a tu correo desde la opción de abajo.';

export const GET: APIRoute = async ({ url, request, cookies, redirect }) => {
	const code = url.searchParams.get('code') ?? undefined;
	const tokenHash = url.searchParams.get('token_hash') ?? undefined;
	const token = url.searchParams.get('token') ?? undefined;
	const type = url.searchParams.get('type') ?? undefined;
	const errorParam = url.searchParams.get('error') ?? undefined;
	const errorCode = url.searchParams.get('error_code') ?? undefined;

	log.info('invite-callback hit', {
		hasCode: !!code,
		hasTokenHash: !!tokenHash,
		type,
		errorParam,
		errorCode,
	});

	const supabase = createSupabaseServerClient({
		headers: request.headers,
		cookies,
	});

	// Si el token falla pero ya hay sesión (el primer clic la creó en este
	// navegador), continuar al set-password como si nada.
	const continueIfSession = async (): Promise<Response | null> => {
		const { data, error } = await supabase.auth.getClaims();
		if (!error && data?.claims) {
			log.info('token inválido pero sesión activa; continuando', {
				userId: data.claims.sub,
			});
			return redirect(PATHS.setPassword);
		}
		return null;
	};

	// Supabase redirige con parámetros de error cuando el token expiró o ya
	// fue usado (p.ej. consumido por un escáner de emails tipo Safe Links).
	if (errorParam) {
		const resumed = await continueIfSession();
		if (resumed) return resumed;

		log.warn('invite link rejected by Supabase', { errorParam, errorCode });
		return redirectWithMessage(
			redirect,
			errorCode === 'otp_expired' ? EXPIRED_MESSAGE : INVALID_MESSAGE,
			'error',
			PATHS.setPassword,
		);
	}

	try {
		// Caso 1: PKCE (link con ?code=)
		if (code) {
			const auth = new AuthService(supabase, cookies);
			await auth.handleInviteCallback({ code, token });
			return redirect(PATHS.setPassword);
		}

		// Caso 2: OTP por token_hash (recomendado para invite por email)
		if (tokenHash) {
			const { error } = await supabase.auth.verifyOtp({
				type: (type as 'invite' | undefined) ?? 'invite',
				token_hash: tokenHash,
			});
			if (error) {
				const resumed = await continueIfSession();
				if (resumed) return resumed;

				log.warn('verifyOtp failed', { message: error.message });
				return redirectWithMessage(
					redirect,
					EXPIRED_MESSAGE,
					'error',
					PATHS.setPassword,
				);
			}
			return redirect(PATHS.setPassword);
		}

		return redirectWithMessage(
			redirect,
			INVALID_MESSAGE,
			'error',
			PATHS.setPassword,
		);
	} catch (error) {
		const resumed = await continueIfSession();
		if (resumed) return resumed;

		log.error('invite-callback error', {
			error,
			message: (error as Error)?.message,
		});
		const message = error instanceof AuthError ? error.message : EXPIRED_MESSAGE;
		return redirectWithMessage(redirect, message, 'error', PATHS.setPassword);
	}
};
