// src/lib/auth/auth.service.ts
// ─── Servicio de autenticación ──────────────────────────
// Encapsula TODA la lógica de negocio de auth.
// Los API routes (pages/api/auth/) son thin handlers que delegan aquí.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { AstroCookies } from 'astro';
import type {
	SignInWithPasswordDto,
	RegisterDto,
	ForgotPasswordDto,
	AuthResult,
	AuthUser,
	OAuthProvider,
	OAuthResult,
} from './auth.types';
import {
	mapAuthResult,
	mapSupabaseUser,
	VALID_OAUTH_PROVIDERS,
} from './auth.types';
import { VALIDATION } from './auth.config';
import { friendlyAuthError } from './auth.helpers';

/**
 * AuthService — un servicio por request.
 *
 * Recibe el SupabaseClient ya configurado con cookies (creado vía
 * `createSupabaseServerClient` de `@lib/supabase/server.ts`) y las cookies
 * de Astro para poder setear/limpiar tokens.
 *
 * @example
 * ```ts
 * // En un API route:
 * const supabase = createSupabaseServerClient({ headers: request.headers, cookies });
 * const auth = new AuthService(supabase, cookies);
 * const result = await auth.signInWithPassword({ email, password });
 * ```
 */
export class AuthService {
	constructor(
		private readonly supabase: SupabaseClient,
		_cookies?: AstroCookies,
	) { }

	// ─── Email/Password Auth ────────────────────────────────

	/**
	 * Inicia sesión con email y contraseña.
	 * Las cookies de sesión se gestionan automáticamente por @supabase/ssr.
	 */
	async signInWithPassword(dto: SignInWithPasswordDto): Promise<AuthResult> {
		if (!dto.email || !dto.password) {
			throw new AuthError('Correo electrónico y contraseña son obligatorios.');
		}

		const { data, error } = await this.supabase.auth.signInWithPassword({
			email: dto.email,
			password: dto.password,
		});

		if (error) {
			throw new AuthError(friendlyAuthError(error.message, error.code));
		}

		if (!data.session) {
			throw new AuthError('No se pudo iniciar sesión. Inténtalo nuevamente.');
		}

		return mapAuthResult(data.user, data.session);
	}

	/**
	 * Registra un nuevo usuario con email, contraseña y metadatos.
	 * Las cookies se gestionan automáticamente por @supabase/ssr si no requiere confirmación.
	 */
	async register(
		dto: RegisterDto,
	): Promise<{ requiresEmailConfirmation: boolean; user?: AuthUser }> {
		// Validaciones
		if (!dto.email || !dto.password) {
			throw new AuthError('Correo electrónico y contraseña son obligatorios.');
		}
		if (!VALIDATION.emailRegex.test(dto.email)) {
			throw new AuthError('Por favor, introduce un correo electrónico válido.');
		}
		if (dto.password.length < VALIDATION.passwordMinLength) {
			throw new AuthError(
				`La contraseña debe tener al menos ${VALIDATION.passwordMinLength} caracteres.`,
			);
		}

		const { data, error } = await this.supabase.auth.signUp({
			email: dto.email,
			password: dto.password,
			options: {
				data: {
					name: dto.name,
					lastName: dto.lastName,
				},
			},
		});

		if (error) {
			console.error('[AuthService.register] Supabase error original:', {
				message: error.message,
				code: error.code,
				status: error.status,
				name: error.name,
			});
			throw new AuthError(friendlyAuthError(error.message, error.code));
		}

		// Si el usuario ya existía (identities vacías)
		if (data.user?.identities?.length === 0) {
			throw new AuthError(
				'Este correo electrónico ya está registrado. Por favor, inicia sesión.',
			);
		}

		// Si se devuelve sesión (email confirmation deshabilitada),
		// @supabase/ssr ya seteó las cookies automáticamente via setAll()
		if (data.session) {
			return {
				requiresEmailConfirmation: false,
				user: mapSupabaseUser(data.user!),
			};
		}

		return { requiresEmailConfirmation: true };
	}

	// ─── OAuth ────────────────────────────────────────────

	/**
	 * Inicia el flujo OAuth y devuelve la URL de autorización.
	 */
	async signInWithOAuth(
		provider: OAuthProvider,
		redirectTo: string,
	): Promise<OAuthResult> {
		if (!VALID_OAUTH_PROVIDERS.includes(provider)) {
			throw new AuthError(`Proveedor OAuth no soportado: ${provider}`);
		}

		const { data, error } = await this.supabase.auth.signInWithOAuth({
			provider,
			options: {
				redirectTo,
				queryParams: {
					access_type: 'offline',
					prompt: 'consent',
				},
			},
		});

		if (error || !data.url) {
			throw new AuthError(
				error?.message ?? 'No se pudo iniciar sesión con el proveedor OAuth.',
			);
		}

		return { url: data.url };
	}

	/**
	 * Intercambia un código de autorización OAuth por una sesión.
	 * Las cookies se gestionan automáticamente por @supabase/ssr.
	 * Incluye retry para errores PKCE.
	 */
	async exchangeCodeForSession(code: string): Promise<AuthResult> {
		const MAX_ATTEMPTS = 2;

		for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
			try {
				const { data, error } =
					await this.supabase.auth.exchangeCodeForSession(code);

				if (error || !data.session) {
					const errMsg = error?.message ?? 'Error desconocido';

					// Retry para errores PKCE/state conocidos
					if (this.isPkceError(errMsg) && attempt < MAX_ATTEMPTS) {
						await this.delay(300);
						continue;
					}

					throw new AuthError(
						'No se pudo completar el inicio de sesión. Inténtalo nuevamente.',
					);
				}

				return mapAuthResult(data.user, data.session);
			} catch (err) {
				if (err instanceof AuthError) throw err;

				if (attempt === MAX_ATTEMPTS) {
					throw new AuthError(
						'Ocurrió un error interno al procesar el inicio de sesión.',
					);
				}
				await this.delay(300);
			}
		}

		throw new AuthError(
			'No se pudo completar el inicio de sesión. Inténtalo nuevamente.',
		);
	}

	// ─── Session Management ───────────────────────────────

	/**
	 * Cierra la sesión del usuario.
	 * @supabase/ssr limpia las cookies automáticamente via setAll().
	 */
	async signOut(): Promise<void> {
		await this.supabase.auth.signOut();
	}

	/**
	 * Obtiene el usuario autenticado actual desde la sesión.
	 * Retorna null si no hay sesión válida.
	 */
	async getCurrentUser(): Promise<AuthUser | null> {
		const { data, error } = await this.supabase.auth.getUser();

		if (error?.name === 'AuthSessionMissingError') {
			return null;
		}

		if (error || !data.user) {
			return null;
		}

		return mapSupabaseUser(data.user);
	}

	/**
	 * Verifica si existe una sesión válida.
	 * Retorna info del usuario si existe.
	 */
	async checkSession(): Promise<{
		isAuthenticated: boolean;
		user: AuthUser | null;
	}> {
		const user = await this.getCurrentUser();
		return {
			isAuthenticated: user !== null,
			user,
		};
	}

	/**
	 * Obtiene el access token actual (para uso con APIs externas como SurveyJS).
	 * Primero valida el usuario server-side con getUser(), luego obtiene el token.
	 */
	async getAccessToken(): Promise<string | undefined> {
		// 1. SIEMPRE validar primero con getUser() (server-verified)
		const { data: { user }, error } = await this.supabase.auth.getUser();
		if (error || !user) return undefined;
		// 2. getSession() aquí es seguro porque:
		//    - getUser() ya verificó la autenticidad del usuario
		//    - Solo necesitamos el access_token para APIs externas (SurveyJS)
		//    - El token fue refrescado por getUser() si estaba expirado
		const { data: { session } } = await this.supabase.auth.getSession();
		return session?.access_token;
	}

	// ─── Password Recovery ────────────────────────────────

	/**
	 * Envía un email de recuperación de contraseña.
	 * Por seguridad, no revela si el email existe o no.
	 */
	async forgotPassword(dto: ForgotPasswordDto): Promise<void> {
		if (!dto.email) {
			throw new AuthError('El email es requerido.');
		}

		const { error } = await this.supabase.auth.resetPasswordForEmail(
			dto.email,
			{
				redirectTo: dto.redirectTo,
			},
		);

		if (error) {
			// Log pero no exponer al usuario si el email existe
			console.error(
				'[AuthService] resetPasswordForEmail error:',
				error.message,
			);
		}

		// Siempre respondemos lo mismo por seguridad
	}

	/**
	 * Establece una nueva contraseña para el usuario autenticado.
	 * Se usa después de que el usuario accede via el link de reset password.
	 */
	async resetPassword(newPassword: string): Promise<void> {
		if (!newPassword || newPassword.length < VALIDATION.passwordMinLength) {
			throw new AuthError(
				`La contraseña debe tener al menos ${VALIDATION.passwordMinLength} caracteres.`,
			);
		}

		const { error } = await this.supabase.auth.updateUser({
			password: newPassword,
		});

		if (error) {
			console.error(
				'[AuthService.resetPassword] Error:',
				error.message,
			);
			throw new AuthError(
				friendlyAuthError(error.message, error.code),
			);
		}
	}

	// ─── Invite Handling ──────────────────────────────────

	/**
	 * Procesa un callback de invitación usando código o token.
	 * Las cookies se gestionan automáticamente por @supabase/ssr.
	 */
	async handleInviteCallback(params: {
		code?: string | undefined;
		token?: string | undefined;
	}): Promise<AuthResult> {
		if (params.code) {
			return this.exchangeCodeForSession(params.code);
		}

		if (params.token) {
			const { data, error } = await this.supabase.auth.verifyOtp({
				type: 'signup',
				token_hash: params.token,
			});

			if (error || !data.session) {
				throw new AuthError('No se pudo verificar el token de invitación.');
			}

			return mapAuthResult(data.user!, data.session);
		}

		throw new AuthError("Parámetros inválidos: se requiere 'code' o 'token'.");
	}

	// ─── Private Helpers ──────────────────────────────────

	private isPkceError(message: string): boolean {
		const pkceErrors = [
			'code challenge does not match',
			'bad_code_verifier',
			'invalid state',
			'token is expired',
		];
		const lower = message.toLowerCase();
		return pkceErrors.some((p) => lower.includes(p));
	}

	private delay(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}
}

// ─── Custom Error ─────────────────────────────────────────

export class AuthError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'AuthError';
	}
}
