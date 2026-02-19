// src/lib/auth/auth.config.ts
// ─── Configuración centralizada del módulo de autenticación ─

import type { AstroCookieSetOptions } from 'astro';

// ─── Cookie Configuration ───────────────────────────────

const isProduction = import.meta.env.PROD;

/**
 * Opciones por defecto para las cookies de autenticación.
 * httpOnly: true → no accesible desde JS del browser (más seguro).
 * sameSite: 'lax' → protección CSRF, permite navegación normal.
 * secure: true en producción → solo HTTPS.
 */
export const AUTH_COOKIE_OPTIONS: AstroCookieSetOptions = {
	path: '/',
	httpOnly: true,
	secure: isProduction,
	sameSite: 'lax',
	maxAge: 60 * 60 * 24 * 7, // 7 días
};

export const AUTH_COOKIE_NAMES = {
	accessToken: 'sb-access-token',
	refreshToken: 'sb-refresh-token',
} as const;

// ─── Route Configuration ────────────────────────────────

/** Rutas que requieren autenticación */
export const PROTECTED_ROUTES: readonly string[] = [
	'/dashboard',
	'/settings',
	'/profile',
	'/empresas',
	'/partners',
	'/crud',
	'/notificaciones',
	'/forms',
];

/** Rutas de autenticación (redirigir al dash si ya está logueado) */
export const AUTH_ROUTES: readonly string[] = [
	'/sign-in',
	'/sign-up',
	'/forgot-password',
];

/** Rutas siempre públicas (nunca bloquear) */
export const PUBLIC_ROUTES: readonly string[] = [
	'/api',
	'/start',
	'/incorporacion-y-pago',
	'/test',
	'/playground',
];

// ─── Default Paths ──────────────────────────────────────

export const PATHS = {
	signIn: '/sign-in',
	signUp: '/sign-up',
	dashboard: '/dashboard',
	home: '/',
	forgotPassword: '/forgot-password',
	resetPassword: '/reset-password',
	oauthCallback: '/api/auth/callback',
} as const;

// ─── Validation ─────────────────────────────────────────

export const VALIDATION = {
	passwordMinLength: 6,
	emailRegex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
} as const;
