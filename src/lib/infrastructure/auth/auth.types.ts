// src/lib/auth/auth.types.ts
// ─── Tipos y DTOs del módulo de autenticación ──────────────

import type { User as SupabaseUser, Session } from '@supabase/supabase-js';

// ─── Request DTOs ───────────────────────────────────────

export interface SignInWithPasswordDto {
	email: string;
	password: string;
}

export interface SignInWithOAuthDto {
	provider: OAuthProvider;
	/** URL de callback tras autorización OAuth */
	redirectTo: string;
}

export interface RegisterDto {
	email: string;
	password: string;
	name: string;
	lastName: string;
}

export interface ForgotPasswordDto {
	email: string;
	/** URL a la que redirigir tras reset (ej: https://domain/auth/reset-password) */
	redirectTo: string;
}

// ─── Response Types ─────────────────────────────────────

export interface AuthUser {
	id: string;
	email: string;
	name: string;
	lastName: string;
	avatarUrl?: string | null;
	createdAt: string;
}

export interface AuthSession {
	accessToken: string;
	refreshToken: string;
	expiresAt: number;
}

export interface AuthResult {
	user: AuthUser;
	session: AuthSession;
}

export interface OAuthResult {
	url: string;
}

// ─── Enums / Literals ───────────────────────────────────

export type OAuthProvider = 'google';

export const VALID_OAUTH_PROVIDERS: readonly OAuthProvider[] = [
	'google',
] as const;

export type RedirectStatus = 'success' | 'error' | 'info';

// ─── Mappers ────────────────────────────────────────────
import { getAvatarUrl } from '@shared/avatar';

export function mapSupabaseUser(user: SupabaseUser): AuthUser {
	const meta = user.user_metadata ?? {};
	return {
		id: user.id,
		email: user.email ?? '',
		name: meta.name ?? meta.full_name ?? '',
		lastName: meta.lastName ?? meta.last_name ?? '',
		avatarUrl: getAvatarUrl(meta.avatar_url),
		createdAt: user.created_at,
	};
}

export function mapAuthResult(
	user: SupabaseUser,
	session: Session,
): AuthResult {
	return {
		user: mapSupabaseUser(user),
		session: {
			accessToken: session.access_token,
			refreshToken: session.refresh_token,
			expiresAt: session.expires_at ?? 0,
		},
	};
}
