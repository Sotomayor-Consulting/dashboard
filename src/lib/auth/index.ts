// src/lib/auth/index.ts
// ─── Barrel exports del módulo de autenticación ─────────

// Service
export { AuthService, AuthError } from './auth.service';

// Types
export type {
	SignInWithPasswordDto,
	SignInWithOAuthDto,
	RegisterDto,
	ForgotPasswordDto,
	AuthUser,
	AuthSession,
	AuthResult,
	OAuthResult,
	OAuthProvider,
	RedirectStatus,
} from './auth.types';
export {
	mapSupabaseUser,
	mapAuthResult,
	VALID_OAUTH_PROVIDERS,
} from './auth.types';

// Config
export { PATHS, VALIDATION } from './auth.config';

// Helpers
export {
	redirectWithMessage,
	buildMessageUrl,
	buildOAuthRedirectUrl,
	jsonResponse,
	jsonError,
	jsonSuccess,
	friendlyAuthError,
} from './auth.helpers';
