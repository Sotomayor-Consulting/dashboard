// src/lib/auth/auth.helpers.ts
// ─── Helpers compartidos del módulo de autenticación ────

import type { RedirectStatus } from './auth.types';
import { PATHS } from './auth.config';

type AstroRedirectFn = (
	path: string,
	status?: 301 | 302 | 303 | 307 | 308 | 300 | 304 | undefined,
) => Response;

/**
 * Construye una URL con parámetros de mensaje de estado.
 */
export function buildMessageUrl(
	destination: string,
	message: string,
	status: RedirectStatus = 'error',
): string {
	const params = new URLSearchParams({ status, msg: message });
	return `${destination}?${params.toString()}`;
}

/**
 * Redirige con un mensaje de estado adjunto como query params.
 */
export function redirectWithMessage(
	redirect: AstroRedirectFn,
	message: string,
	status: RedirectStatus = 'error',
	destination: string = PATHS.signIn,
): Response {
	return redirect(buildMessageUrl(destination, message, status));
}

/**
 * Construye la URL de callback para OAuth.
 * Prioriza variable de entorno > header Host > fallback localhost.
 */
export function buildOAuthRedirectUrl(
	request: Request,
	callbackPath: string = PATHS.oauthCallback,
): string {
	// 1. Variable de entorno explícita (preferido para deploys)
	const envRedirect = (process.env.SUPABASE_OAUTH_REDIRECT_TO ?? '').trim();
	if (envRedirect) return envRedirect;

	// 2. Construir desde Host header (validado contra hosts permitidos)
	const host = request.headers.get('host');
	const allowedHosts = [
		'dashboard.sotomayorconsulting.com',
		'localhost:4321',
		'localhost:3000',
	];
	if (host && allowedHosts.some((h) => host === h)) {
		const scheme = host.startsWith('localhost') ? 'http' : 'https';
		return `${scheme}://${host}${callbackPath}`;
	}

	// 3. Fallback para desarrollo local
	return `http://localhost:4321${callbackPath}`;
}

/**
 * Crea una respuesta JSON tipada.
 */
export function jsonResponse<T>(data: T, status: number = 200): Response {
	return new Response(JSON.stringify(data), {
		status,
		headers: { 'Content-Type': 'application/json' },
	});
}

/**
 * Crea una respuesta JSON de error.
 */
export function jsonError(message: string, status: number = 400): Response {
	return jsonResponse({ ok: false, error: message }, status);
}

/**
 * Crea una respuesta JSON de éxito.
 */
export function jsonSuccess<T>(data: T, status: number = 200): Response {
	return jsonResponse({ ok: true, data }, status);
}

/**
 * Convierte errores de Supabase a mensajes user-friendly en español.
 */
export function friendlyAuthError(
	errorMessage: string,
	errorCode?: string,
): string {
	const msg = (errorMessage ?? '').toLowerCase();
	const code = (errorCode ?? '').toLowerCase();

	if (msg.includes('already registered') || code === 'user_already_exists') {
		return 'Este correo electrónico ya está registrado. ¿Olvidaste tu contraseña?';
	}
	if (msg.includes('password') || code === 'weak_password') {
		return 'La contraseña no cumple con los requisitos de seguridad.';
	}
	if (
		msg.includes('invalid login credentials') ||
		msg.includes('invalid_credentials')
	) {
		return 'Correo o contraseña incorrectos. Revisa tus datos e inténtalo nuevamente.';
	}
	if (msg.includes('email') || code === 'invalid_email') {
		return 'El correo electrónico no es válido.';
	}
	if (msg.includes('rate limit') || code === 'over_request_rate_limit') {
		return 'Demasiados intentos. Por favor, espera unos minutos.';
	}
	if (msg.includes('signup_disabled') || code === 'signup_disabled') {
		return 'El registro de nuevos usuarios está deshabilitado temporalmente.';
	}
	if (
		msg.includes('email_provider_disabled') ||
		code === 'email_provider_disabled'
	) {
		return 'El registro por correo electrónico no está habilitado. Contacta al administrador.';
	}
	if (msg.includes('validation_failed') || code === 'validation_failed') {
		return 'Los datos proporcionados no son válidos. Revisa tu correo y contraseña.';
	}
	if (msg.includes('unexpected') || code === 'unexpected_failure') {
		return 'Error inesperado del servidor de autenticación. Inténtalo nuevamente.';
	}

	// Fallback: loguear internamente pero no exponer detalles al usuario
	console.warn('[friendlyAuthError] Error no mapeado:', {
		errorMessage,
		errorCode,
	});
	return 'Ocurrió un error inesperado. Inténtalo nuevamente.';
}
