// ─── Helpers para verificar roles en vistas/layouts ─────

/** Nombres exactos de la tabla `roles.name` en BD */
export const ROLES = {
	ADMIN: 'admin',
	PARTNER: 'partner',
	CLIENT: 'cliente',
	OPERACIONES: 'operaciones',
} as const;

export type RoleName = (typeof ROLES)[keyof typeof ROLES];

/** Configuración de acceso por rol para rutas protegidas */
export interface RouteRoleConfig {
	path: string;
	roles: RoleName[];
	errorMsg: string;
}

/** Tipo que Supabase devuelve para la relación user_roles → roles */
export interface UserRoleRow {
	rol_id: string;
	roles: { name: string } | { name: string }[] | null;
}

export function hasRole(userRoles: string[], role: RoleName): boolean {
	return userRoles.includes(role);
}

export function hasAnyRole(userRoles: string[], roles: RoleName[]): boolean {
	return roles.some((role) => userRoles.includes(role));
}

export function isAdmin(userRoles: string[]): boolean {
	return hasRole(userRoles, ROLES.ADMIN);
}

export function isPartner(userRoles: string[]): boolean {
	return hasRole(userRoles, ROLES.PARTNER);
}

export function isClient(userRoles: string[]): boolean {
	return hasRole(userRoles, ROLES.CLIENT);
}

export function isOperaciones(userRoles: string[]): boolean {
	return hasRole(userRoles, ROLES.OPERACIONES);
}

/**
 * Extrae los nombres de rol desde la respuesta de Supabase.
 * Maneja tanto objeto como array en la relación FK.
 */
export function extractRoleNames(rows: UserRoleRow[] | null): RoleName[] {
	if (!rows) return [];

	return rows
		.map((ur) => {
			if (!ur.roles) return null;
			if (Array.isArray(ur.roles)) {
				return ur.roles[0]?.name ?? null;
			}
			return ur.roles.name;
		})
		.filter((name): name is RoleName => {
			const validRoles: string[] = Object.values(ROLES);
			return typeof name === 'string' && validRoles.includes(name);
		});
}
