// src/lib/auth/auth.config.ts
// ─── Configuración centralizada del módulo de autenticación ─
// Las cookies de sesión son gestionadas automáticamente por @supabase/ssr
// a través del callback setAll() en createSupabaseServerClient.

// ─── Route Configuration ────────────────────────────────
// Las rutas protegidas, públicas y de auth se definen directamente
// en src/middleware.ts (ROLE_ROUTES, PUBLIC_ROUTES, AUTH_ROUTES).
// No duplicar aquí para evitar desincronización.

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
