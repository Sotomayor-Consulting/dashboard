import type { SupabaseClient } from '@supabase/supabase-js';

import type {
	AdminEmpresa,
	AdminEmpresaDetail,
	AdminEmpresaMember,
	EntityType,
	LegalStatus,
} from '@modules/admin/lib/empresa-types';

interface RawCompanyRow {
	id: string;
	incorporation_id: string | null;
	legal_name: string | null;
	entity_type: string | null;
	formation_state_id: number | null;
	filing_number: string | null;
	identification_number: string | null;
	incorporation_date: string | null;
	legal_status: string | null;
	tax_clasification: string | null;
	management_type: string | null;
	us_source_income: boolean | null;
	user_id: string | null;
	created_at: string | null;
	updated_at: string | null;
	usuarios:
		| {
				user_id: string;
				nombre: string | null;
				apellido: string | null;
				correo: string | null;
				avatar_url: string | null;
		  }
		| Array<{
				user_id: string;
				nombre: string | null;
				apellido: string | null;
				correo: string | null;
				avatar_url: string | null;
		  }>
		| null;
}

function takeOne<T>(v: T | T[] | null | undefined): T | null {
	if (!v) return null;
	return Array.isArray(v) ? (v[0] ?? null) : v;
}

function buildEmpresa(
	row: RawCompanyRow,
	stateName: string | null,
	incorporationId: string | null,
): AdminEmpresa {
	const u = takeOne(row.usuarios);
	const owner = u
		? {
				id: u.user_id,
				name:
					[u.nombre, u.apellido].filter(Boolean).join(' ').trim() ||
					u.correo ||
					'Sin nombre',
				email: u.correo ?? '',
				avatarUrl: u.avatar_url,
			}
		: null;

	const entityTypeNorm = (row.entity_type ?? '').toLowerCase() as EntityType;
	const legalStatusNorm = ((row.legal_status ?? 'draft').toLowerCase() ||
		'draft') as LegalStatus;

	return {
		id: row.id,
		legalName: row.legal_name ?? 'Sin nombre',
		entityType: entityTypeNorm || null,
		formationState: stateName,
		filingNumber: row.filing_number,
		ein: row.identification_number,
		incorporationDate: row.incorporation_date,
		legalStatus: legalStatusNorm,
		taxClassification: row.tax_clasification,
		managementType: row.management_type,
		usSourceIncome: !!row.us_source_income,
		owner,
		incorporationId,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
}

/**
 * Lista de empresas (entidades legales ya constituidas).
 */
export async function listAdminEmpresas(
	supabase: SupabaseClient,
): Promise<AdminEmpresa[]> {
	const { data: companies, error } = await supabase
		.from('companies')
		.select(
			`id, incorporation_id, legal_name, entity_type, formation_state_id, filing_number,
			 identification_number, incorporation_date, legal_status, tax_clasification,
			 management_type, us_source_income, user_id, created_at, updated_at,
			 usuarios:user_id ( user_id, nombre, apellido, correo, avatar_url )`,
		)
		.order('created_at', { ascending: false });

	if (error) throw error;
	if (!companies) return [];

	// Resolver formation_state_id → state name
	const stateIds = Array.from(
		new Set(
			companies
				.map((c: { formation_state_id: number | null }) => c.formation_state_id)
				.filter((v: number | null): v is number => v !== null),
		),
	);

	const stateMap = new Map<number, string>();
	if (stateIds.length > 0) {
		const { data: statesRows } = await supabase
			.from('states')
			.select('id, name')
			.in('id', stateIds);
		for (const s of statesRows ?? []) {
			const row = s as { id: number; name: string | null };
			if (row.name) stateMap.set(row.id, row.name);
		}
	}

	const incorpByCompany = new Map<string, string>();
	for (const c of companies as { id: string; incorporation_id: string | null }[]) {
		if (c.incorporation_id) incorpByCompany.set(c.id, c.incorporation_id);
	}

	return (companies as unknown as RawCompanyRow[]).map((row) =>
		buildEmpresa(
			row,
			row.formation_state_id ? (stateMap.get(row.formation_state_id) ?? null) : null,
			incorpByCompany.get(row.id) ?? null,
		),
	);
}

/**
 * Detalle de una empresa: incluye miembros y direcciones.
 */
export async function getAdminEmpresaDetail(
	supabase: SupabaseClient,
	id: string,
): Promise<AdminEmpresaDetail | null> {
	const all = await listAdminEmpresas(supabase);
	const base = all.find((c) => c.id === id);
	if (!base) return null;

	const [{ data: membersRows }, { data: addrRows }] = await Promise.all([
		supabase
			.from('company_members')
			.select(
				'id, full_name, email, percentage, is_manager, is_member',
			)
			.eq('company_id', id),
		supabase
			.from('company_addresses')
			.select('id, type, line1, city, zip, state_id, states:state_id(name)')
			.eq('company_id', id),
	]);

	const members: AdminEmpresaMember[] = (membersRows ?? []).map((m) => {
		const row = m as {
			id: number | string;
			full_name: string | null;
			email: string | null;
			percentage: number | null;
			is_manager: boolean | null;
		};
		return {
			id: String(row.id),
			fullName: row.full_name ?? 'Sin nombre',
			email: row.email,
			percentage: row.percentage,
			isManager: !!row.is_manager,
		};
	});

	const addresses = (addrRows ?? []).map((a) => {
		const row = a as {
			id: number | string;
			type: string | null;
			line1: string | null;
			city: string | null;
			zip: string | null;
			states: { name: string | null } | { name: string | null }[] | null;
		};
		const st = takeOne(row.states);
		return {
			id: String(row.id),
			type: row.type,
			line1: row.line1,
			city: row.city,
			state: st?.name ?? null,
			zip: row.zip,
		};
	});

	return { ...base, members, addresses };
}
