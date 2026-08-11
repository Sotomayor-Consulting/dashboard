// ─── Helpers para verificar roles en vistas/layouts ─────

/** Nombres exactos de la tabla `roles.name` en BD */
export const ROLES = {
	ADMIN: 'admin',
	GERENCIA: 'gerencia',
	PARTNER: 'partner',
	CLIENT: 'cliente',
	OPERACIONES: 'operaciones',
} as const;

export type RoleName = (typeof ROLES)[keyof typeof ROLES];

export const ROLE_GROUPS = {
	COMPANY_STAFF: [ROLES.ADMIN, ROLES.GERENCIA, ROLES.OPERACIONES],
	AUDIT_READERS: [ROLES.ADMIN, ROLES.GERENCIA],
	INCORPORATION_ROUTE: [ROLES.ADMIN, ROLES.GERENCIA, ROLES.OPERACIONES],
	/**
	 * Staff del módulo de documentos. Debe coincidir exactamente con
	 * `STAFF_ROLES` de @domains/documents/config y con `documents.is_staff()`
	 * en Postgres, que son quienes autorizan de verdad.
	 *
	 * No incluye `gerencia`: usar INCORPORATION_ROUTE para estos gates hacía
	 * que un usuario de gerencia viera botones que el servidor rechaza con 403
	 * y cuyas filas la RLS le niega.
	 */
	DOCUMENTS_STAFF: [ROLES.ADMIN, ROLES.OPERACIONES],
} as const satisfies Record<string, readonly RoleName[]>;

/** Configuración de acceso por rol para rutas protegidas */
export interface RouteRoleConfig {
	path: string;
	roles: readonly RoleName[];
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

export function hasAnyRole(
	userRoles: string[],
	roles: readonly RoleName[],
): boolean {
	return roles.some((role) => userRoles.includes(role));
}

export function isAdmin(userRoles: string[]): boolean {
	return hasRole(userRoles, ROLES.ADMIN);
}

export function isGerencia(userRoles: string[]): boolean {
	return hasRole(userRoles, ROLES.GERENCIA);
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

export function canManageCompanyData(userRoles: string[]): boolean {
	return hasAnyRole(userRoles, ROLE_GROUPS.COMPANY_STAFF);
}

export function canReadAuditEvents(userRoles: string[]): boolean {
	return hasAnyRole(userRoles, ROLE_GROUPS.AUDIT_READERS);
}

/**
 * Staff del módulo de documentos: subir, compartir, revocar, archivar y
 * revisar solicitudes. El borrado permanente exige además `isAdmin`.
 */
export function canManageDocuments(userRoles: string[]): boolean {
	return hasAnyRole(userRoles, ROLE_GROUPS.DOCUMENTS_STAFF);
}

export function extractTokenRoleNames(
	claims: Record<string, unknown>,
): RoleName[] {
	const fromClaim = claims['user_roles'];
	if (!Array.isArray(fromClaim)) return [];

	return fromClaim.filter((role): role is RoleName => {
		const validRoles: string[] = Object.values(ROLES);
		return typeof role === 'string' && validRoles.includes(role);
	});
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
