/**
 * Tipos del panel de administración (Operaciones).
 *
 * Adaptan el data-model del handoff a las tablas reales de Supabase
 * (`usuarios`, `user_roles`, `roles`, `empresas_incorporaciones`).
 */

export const USER_ROLES = [
	'admin',
	'operaciones',
	'cliente',
	'partner',
] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const ALL_ROLE_NAMES = [
	'admin',
	'operaciones',
	'cliente',
	'partner',
	'incorporator',
	'mailing',
	'client',
	'operations',
] as const;
export type AnyRoleName = (typeof ALL_ROLE_NAMES)[number];

/** Filtro pill de la tabla de clientes. */
export const USER_FILTERS = [
	'todos',
	'cliente',
	'ops',
	'admin',
	'partner',
	'sin',
] as const;
export type UserFilter = (typeof USER_FILTERS)[number];

export interface AdminUser {
	/** UUID de `usuarios.user_id`. */
	id: string;
	name: string;
	email: string;
	avatarUrl: string | null;
	countryCode: string | null;
	organization: string | null;
	jobTitle: string | null;
	/** Estado de cuenta: derivado de `usuarios.estado`. */
	status: 'active' | 'pending';
	/** Nombres de rol obtenidos de la tabla `roles` vía `user_roles`. */
	roles: AnyRoleName[];
	/** Conteo de empresas vinculadas (cliente o referido). */
	companiesCount: number;
	/** Último ingreso (ISO) — null si nunca entró. */
	lastSignInAt: string | null;
	createdAt: string | null;
}

export interface LinkedCompany {
	id: string;
	name: string;
	type: string | null;
	state: string | null;
	stage: number | null;
}

export interface AdminUserDetail extends AdminUser {
	companies: LinkedCompany[];
}
