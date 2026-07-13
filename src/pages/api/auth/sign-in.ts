// ─── Thin handler: Sign In ──────────────────────────────
export const prerender = false;

import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '@infrastructure/supabase';
import {
	AuthService,
	AuthError,
	PATHS,
	redirectWithMessage,
	buildOAuthRedirectUrl,
	jsonSuccess,
	jsonError,
} from '@infrastructure/auth';
import { safeBack } from '@infrastructure/security/headers';
import {
	checkRateLimit,
	peekRateLimit,
	recordHit,
} from '@infrastructure/security/rate-limit';
import type { OAuthProvider } from '@infrastructure/auth';
import type { SupabaseClient } from '@supabase/supabase-js';
import { TURNSTILE_SECRET_KEY } from 'astro:env/server';
import { createLogger } from '@infrastructure/logging';

const log = createLogger('turnstile');

// Safety net: si algo hace GET a esta ruta, redirigir al formulario
export const GET: APIRoute = async ({ redirect }) => {
	return redirect(PATHS.signIn);
};

// Límites anti fuerza-bruta (OWASP Authentication Cheat Sheet):
// - por IP: frena barridos automatizados desde una misma fuente.
// - por email: solo cuenta INTENTOS FALLIDOS, para que un atacante rotando
//   IPs no pueda adivinar la contraseña de una cuenta concreta. Se usa
//   peek + recordHit para no penalizar logins exitosos.
const IP_LIMIT = 20; // intentos por minuto por IP
const FAIL_LIMIT = 5; // fallos por email
const FAIL_WINDOW_MS = 15 * 60_000;

export const POST: APIRoute = async ({
	request,
	cookies,
	redirect,
	locals,
	clientAddress,
}) => {
	const formData = await request.formData();
	const email = formData.get('email')?.toString();
	const password = formData.get('password')?.toString();
	const provider = formData.get('provider')?.toString();
	const remember = formData.has('remember');
	const next = safeBack(formData.get('next')?.toString(), PATHS.home);
	const turnstileToken = formData.get('cf-turnstile-response')?.toString();

	// Detectar si el cliente espera JSON (fetch desde React)
	const wantsJson = request.headers
		.get('Accept')
		?.includes('application/json');

	const emailKey = email?.trim().toLowerCase() ?? '';
	const tooMany = (msg: string) =>
		wantsJson
			? jsonError(msg, 429)
			: redirectWithMessage(redirect, msg, 'error', PATHS.signIn);

	if (!checkRateLimit(`signin:ip:${clientAddress}`, IP_LIMIT, 60_000)) {
		log.warn('sign-in rate limited por IP', { ip: clientAddress });
		return tooMany('Demasiados intentos. Espera un minuto e intenta de nuevo.');
	}
	if (
		!provider &&
		emailKey &&
		!peekRateLimit(`signin:fail:${emailKey}`, FAIL_LIMIT, FAIL_WINDOW_MS)
	) {
		log.warn('sign-in rate limited por fallos de email', { email: emailKey });
		return tooMany(
			'Demasiados intentos fallidos para esta cuenta. Espera 15 minutos o restablece tu contraseña.',
		);
	}

	// ─── Turnstile verification ──────────────────────
	const turnstileSecret = TURNSTILE_SECRET_KEY;
	log.info('turnstile check', {
		hasSecret: !!turnstileSecret,
		secretLength: turnstileSecret?.length,
		secretPreview: turnstileSecret ? `${turnstileSecret.slice(0, 6)}...${turnstileSecret.slice(-4)}` : null,
		hasToken: !!turnstileToken,
		tokenLength: turnstileToken?.length,
		tokenPreview: turnstileToken ? `${turnstileToken.slice(0, 20)}...` : null,
		provider: provider ?? null,
	});

	if (turnstileSecret && !provider) {
		if (!turnstileToken) {
			log.warn('turnstile token missing from form');
			const msg = 'Verificación de seguridad requerida.';
			return wantsJson
				? jsonError(msg, 400)
				: redirectWithMessage(redirect, msg, 'error', PATHS.signIn);
		}

		const verifyBody = new URLSearchParams();
		verifyBody.set('secret', turnstileSecret);
		verifyBody.set('response', turnstileToken);

		const verifyRes = await fetch(
			'https://challenges.cloudflare.com/turnstile/v0/siteverify',
			{ method: 'POST', body: verifyBody },
		);
		const verifyData = (await verifyRes.json()) as Record<string, unknown>;
		log.info('turnstile siteverify response', verifyData);

		if (!verifyData.success) {
			log.warn('turnstile verification failed', verifyData);
			const msg = 'Verificación de seguridad fallida. Intenta de nuevo.';
			return wantsJson
				? jsonError(msg, 403)
				: redirectWithMessage(redirect, msg, 'error', PATHS.signIn);
		}

		log.info('turnstile verification passed');
	}

	// Si "Recuérdame" NO está marcado, sessionOnly=true hace que las cookies
	// se setean sin maxAge → expiran al cerrar el browser.
	const supabase =
		(locals.supabase as SupabaseClient | undefined) ??
		createSupabaseServerClient({
			headers: request.headers,
			cookies,
			sessionOnly: !remember,
		});
	const auth = new AuthService(supabase, cookies);

	try {
		// ─── OAuth (Google) ───────────────────────────────
		if (provider) {
			const redirectToUrl = new URL(buildOAuthRedirectUrl(request));
			redirectToUrl.searchParams.set('next', next);
			const result = await auth.signInWithOAuth(
				provider as OAuthProvider,
				redirectToUrl.toString(),
			);
			return redirect(result.url);
		}

		// ─── Email/Password ───────────────────────────────
		await auth.signInWithPassword({
			email: email ?? '',
			password: password ?? '',
		});

		// JSON: devolver respuesta sin redirect para que el browser
		// procese las Set-Cookie headers antes de navegar.
		if (wantsJson) {
			return jsonSuccess({ redirect: next });
		}

		return redirect(next);
	} catch (error) {
		// Solo los intentos fallidos consumen el límite por cuenta
		if (emailKey) recordHit(`signin:fail:${emailKey}`);

		const message =
			error instanceof AuthError
				? error.message
				: 'Error inesperado al iniciar sesión.';

		if (wantsJson) {
			return jsonError(message, 401);
		}

		return redirectWithMessage(redirect, message, 'error', PATHS.signIn);
	}
};
