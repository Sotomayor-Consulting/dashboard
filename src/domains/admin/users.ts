import type { SupabaseClient } from '@supabase/supabase-js';

import { supabaseAdmin } from '@infrastructure/supabase/admin';
import type {
	AdminUser,
	AdminUserDetail,
	AnyRoleName,
	LinkedCompany,
} from '@modules/admin/lib/types';

/**
 * Trae `last_sign_in_at` para todos los usuarios desde Supabase Auth.
 * Usa el cliente admin (service_role) — solo seguro server-side.
 *
 * Auth devuelve hasta 50 usuarios por página por defecto; ajustamos a 1000
 * para cubrir el caso típico de admin sin paginación adicional.
 */
async function getLastSignInMap(): Promise<Map<string, string | null>> {
	const map = new Map<string, string | null>();
	try {
		const { data, error } = await supabaseAdmin.auth.admin.listUsers({
			page: 1,
			perPage: 1000,
		});
		if (error) return map;
		for (const u of data.users) {
			map.set(u.id, u.last_sign_in_at ?? null);
		}
	} catch {
		// Si falla la llamada admin, el resto sigue funcionando con null.
	}
	return map;
}

interface RawUserRow {
	user_id: string;
	nombre: string | null;
	apellido: string | null;
	correo: string | null;
	avatar_url: string | null;
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
		organization: null,
		jobTitle: null,
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
			`user_id, nombre, apellido, correo, avatar_url,
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
		.from('incorporations')
		.select('user_id');

	const countByUser = new Map<string, number>();
	for (const row of counts ?? []) {
		const id = (row as { user_id: string | null }).user_id;
		if (!id) continue;
		countByUser.set(id, (countByUser.get(id) ?? 0) + 1);
	}

	const lastSignInMap = await getLastSignInMap();

	return (users as unknown as RawUserRow[]).map((u) =>
		toAdminUser(
			u,
			countByUser.get(u.user_id) ?? 0,
			lastSignInMap.get(u.user_id) ?? null,
		),
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
			`user_id, nombre, apellido, correo, avatar_url,
			 estado, created_at, pais_id,
			 countries:pais_id ( iso ),
			 user_roles ( roles ( name ) )`,
		)
		.eq('user_id', userId)
		.maybeSingle();

	if (error) throw error;
	if (!user) return null;

	const { data: empresasRaw } = await supabase
		.from('incorporations')
		.select(
			'id, principal_name, entity_type, porcentaje_de_incorporacion',
		)
		.eq('user_id', userId)
		.limit(20);

	const companies: LinkedCompany[] = (empresasRaw ?? []).map((e) => {
		const row = e as {
			id: string;
			principal_name: string | null;
			entity_type: string | null;
			porcentaje_de_incorporacion: number | null;
		};
		return {
			id: String(row.id),
			name: row.principal_name ?? 'Sin nombre',
			type: row.entity_type,
			// estado_de_incorporacion eliminada de incorporations (degradado).
			state: null,
			stage: row.porcentaje_de_incorporacion
				? Math.round((row.porcentaje_de_incorporacion / 100) * 11)
				: null,
		};
	});

	// Trae last_sign_in_at solo para este usuario (más eficiente que listar todos).
	let lastSignInAt: string | null = null;
	try {
		const { data: authUser } =
			await supabaseAdmin.auth.admin.getUserById(userId);
		lastSignInAt = authUser?.user?.last_sign_in_at ?? null;
	} catch {
		// fallback null
	}

	const base = toAdminUser(
		user as unknown as RawUserRow,
		companies.length,
		lastSignInAt,
	);
	return { ...base, companies };
}
