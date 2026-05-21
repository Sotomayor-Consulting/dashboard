import type { SupabaseClient } from '@supabase/supabase-js';

import type {
	AdminUser,
	AdminUserDetail,
	AnyRoleName,
	LinkedCompany,
} from '@modules/admin/lib/types';

interface RawUserRow {
	user_id: string;
	nombre: string | null;
	apellido: string | null;
	correo: string | null;
	avatar_url: string | null;
	organizacion: string | null;
	cargo: string | null;
	estado: string | null;
	created_at: string | null;
	pais_id: number | null;
	countries?: { iso: string | null } | { iso: string | null }[] | null;
	// Supabase a veces tipa el join como array; aceptamos ambos.
	user_roles?: Array<{
		roles: { name: string } | { name: string }[] | null;
	}>;
}

function extractCountryIso(row: RawUserRow): string | null {
	if (!row.countries) return null;
	const c = Array.isArray(row.countries) ? row.countries[0] : row.countries;
	return c?.iso ?? null;
}

function extractRoleNames(row: RawUserRow): AnyRoleName[] {
	return (row.user_roles ?? []).flatMap((ur) => {
		if (!ur.roles) return [];
		const arr = Array.isArray(ur.roles) ? ur.roles : [ur.roles];
		return arr.map((r) => r.name as AnyRoleName).filter(Boolean);
	});
}

function toAdminUser(
	row: RawUserRow,
	companiesCount: number,
	lastSignInAt: string | null,
): AdminUser {
	const fullName = [row.nombre, row.apellido].filter(Boolean).join(' ').trim();
	const roles = extractRoleNames(row);
	const status: 'active' | 'pending' =
		row.estado?.toLowerCase() === 'pendiente' ||
		row.estado?.toLowerCase() === 'pending'
			? 'pending'
			: 'active';
	return {
		id: row.user_id,
		name: fullName || row.correo || 'Sin nombre',
		email: row.correo ?? '',
		avatarUrl: row.avatar_url,
		countryCode: extractCountryIso(row),
		organization: row.organizacion,
		jobTitle: row.cargo,
		status,
		roles,
		companiesCount,
		lastSignInAt,
		createdAt: row.created_at,
	};
}

/**
 * Lista todos los usuarios con sus roles y conteo de empresas.
 * Para vista de admin/operaciones.
 */
export async function listAdminUsers(
	supabase: SupabaseClient,
): Promise<AdminUser[]> {
	const { data: users, error } = await supabase
		.from('usuarios')
		.select(
			`user_id, nombre, apellido, correo, avatar_url, organizacion, cargo,
			 estado, created_at, pais_id,
			 countries:pais_id ( iso ),
			 user_roles ( roles ( name ) )`,
		)
		// Excluir archivados — siguen en DB para restauración pero no en listas activas.
		.not('estado', 'eq', 'archivado')
		.order('created_at', { ascending: false });

	if (error) throw error;
	if (!users) return [];

	// Conteo de empresas por user_id (cliente de la incorporación)
	const { data: counts } = await supabase
		.from('empresas_incorporaciones')
		.select('user_id');

	const countByUser = new Map<string, number>();
	for (const row of counts ?? []) {
		const id = (row as { user_id: string | null }).user_id;
		if (!id) continue;
		countByUser.set(id, (countByUser.get(id) ?? 0) + 1);
	}

	return (users as unknown as RawUserRow[]).map((u) =>
		toAdminUser(u, countByUser.get(u.user_id) ?? 0, null),
	);
}

/**
 * Detalle de un usuario para el drawer: incluye empresas vinculadas.
 */
export async function getAdminUserDetail(
	supabase: SupabaseClient,
	userId: string,
): Promise<AdminUserDetail | null> {
	const { data: user, error } = await supabase
		.from('usuarios')
		.select(
			`user_id, nombre, apellido, correo, avatar_url, organizacion, cargo,
			 estado, created_at, pais_id,
			 countries:pais_id ( iso ),
			 user_roles ( roles ( name ) )`,
		)
		.eq('user_id', userId)
		.maybeSingle();

	if (error) throw error;
	if (!user) return null;

	const { data: empresasRaw } = await supabase
		.from('empresas_incorporaciones')
		.select(
			'empresa_incorporacion_id, nombre_1, tipo_de_negocio, estado_de_incorporacion, porcentaje_de_incorporacion',
		)
		.eq('user_id', userId)
		.limit(20);

	const companies: LinkedCompany[] = (empresasRaw ?? []).map((e) => {
		const row = e as {
			empresa_incorporacion_id: string;
			nombre_1: string | null;
			tipo_de_negocio: string | null;
			estado_de_incorporacion: string | null;
			porcentaje_de_incorporacion: number | null;
		};
		return {
			id: String(row.empresa_incorporacion_id),
			name: row.nombre_1 ?? 'Sin nombre',
			type: row.tipo_de_negocio,
			state: row.estado_de_incorporacion,
			stage: row.porcentaje_de_incorporacion
				? Math.round((row.porcentaje_de_incorporacion / 100) * 11)
				: null,
		};
	});

	const base = toAdminUser(
		user as unknown as RawUserRow,
		companies.length,
		null,
	);
	return { ...base, companies };
}
