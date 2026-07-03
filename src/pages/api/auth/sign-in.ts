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
import type { OAuthProvider } from '@infrastructure/auth';
import type { SupabaseClient } from '@supabase/supabase-js';
import { TURNSTILE_SECRET_KEY } from 'astro:env/server';
import { createLogger } from '@infrastructure/logging';

const log = createLogger('turnstile');

// Safety net: si algo hace GET a esta ruta, redirigir al formulario
export const GET: APIRoute = async ({ redirect }) => {
	return redirect(PATHS.signIn);
};

export const POST: APIRoute = async ({ request, cookies, redirect, locals }) => {
	const formData = await request.formData();
	const email = formData.get('email')?.toString();
	const password = formData.get('password')?.toString();
	const provider = formData.get('provider')?.toString();
	const remember = formData.has('remember');
	const turnstileToken = formData.get('cf-turnstile-response')?.toString();

	// Detectar si el cliente espera JSON (fetch desde React)
	const wantsJson = request.headers
		.get('Accept')
		?.includes('application/json');

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
			const redirectTo = buildOAuthRedirectUrl(request);
			const result = await auth.signInWithOAuth(
				provider as OAuthProvider,
				redirectTo,
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
			return jsonSuccess({ redirect: PATHS.home });
		}

		return redirect(PATHS.home);
	} catch (error) {
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
