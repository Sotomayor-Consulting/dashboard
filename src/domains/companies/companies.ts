import type { SupabaseClient } from '@supabase/supabase-js';

import { getAvatarUrl } from '@shared/avatar';
import type {
	AdminEmpresa,
	AdminEmpresaDetail,
	AdminEmpresaMember,
	EntityType,
	LegalStatus,
} from '@modules/admin/lib/empresa-types';
import type { CompanyRow } from './types/company';
import { COMPANY_COLUMNS } from './types/company';
import {
	INCORPORATION_COLUMNS,
	type IncorporationWithUser,
	type IncorporationWithUserAndState,
	type IncorporationWithState,
} from './types/incorporations';
import { MEMBER_COLUMNS } from '@domains/members/types/member';
import { USUARIO_COLUMNS, type UsuarioRow } from '@domains/users/types/usuario';

// ── Helpers ──

function takeOne<T>(v: T | T[] | null | undefined): T | null {
	if (!v) return null;
	return Array.isArray(v) ? (v[0] ?? null) : v;
}

const pickStateName = (
	v: { name: string } | { name: string }[] | null | undefined,
): string | null => {
	if (!v) return null;
	const row = Array.isArray(v) ? v[0] : v;
	return row?.name ?? null;
};

function buildOwnerFromUsuario(u: UsuarioRow): {
	id: string;
	name: string;
	email: string;
	avatarUrl: string | null;
} {
	return {
		id: u.user_id,
		name:
			[u.nombre, u.apellido].filter(Boolean).join(' ').trim() ||
			u.correo ||
			'Sin nombre',
		email: u.correo ?? '',
		avatarUrl: getAvatarUrl(u.avatar_url),
	};
}

// ── Public functions ──

export const getEmpresaById = async (
	supabase: SupabaseClient,
	empresaId: string,
): Promise<IncorporationWithUser | null> => {
	const { data: empresa, error } = await supabase
		.from('incorporations')
		.select(INCORPORATION_COLUMNS.WITH_USER)
		.eq('id', empresaId)
		.single<IncorporationWithUser>();

	if (error || !empresa) {
		return null;
	}

	return empresa;
};

export const getEmpresasGenenralById = async (
	supabase: SupabaseClient,
	userId: string,
): Promise<IncorporationWithUserAndState[] | null> => {
	const { data: empresas, error } = await supabase
		.from('incorporations')
		.select(INCORPORATION_COLUMNS.WITH_USER_AND_STATE)
		.eq('user_id', userId)
		.order('updated_at', { ascending: true });

	if (error || !empresas) {
		return null;
	}

	return empresas as unknown as IncorporationWithUserAndState[];
};

// ── Switcher types ──

export interface EmpresaSwitcherItem {
	id: string;
	incorporation_id: string | null;
	company_id: string | null;
	nombre: string;
	tipo_de_negocio: string | null;
	estado: string | null;
	estado_de_incorporacion: string | null;
}

/**
 * Unión de incorporaciones (proceso) y companies (canónica) del usuario.
 * Si una empresa tiene incorporación, el switcher la representa a través
 * del `incorporation_id` (la navegación va al dashboard de la incorporación);
 * si no tiene, se enlaza directamente por `company_id`.
 */
export const getEmpresasForSwitcher = async (
	supabase: SupabaseClient,
	userId: string,
): Promise<EmpresaSwitcherItem[]> => {
	const [incResult, compResult] = await Promise.all([
		supabase
			.from('incorporations')
			.select(INCORPORATION_COLUMNS.WITH_STATE)
			.eq('user_id', userId)
			.order('updated_at', { ascending: false }),
		supabase
			.from('companies')
			.select(COMPANY_COLUMNS.WITH_STATE)
			.eq('user_id', userId),
	]);

	const incorporations = (incResult.data ?? []) as IncorporationWithState[];
	const companies = (compResult.data ?? []) as CompanySwitcherRow[];

	const companyByIncorporation = new Map<string, CompanySwitcherRow>(
		companies
			.filter((c) => c.incorporation_id)
			.map((c) => [c.incorporation_id!, c]),
	);

	const items: EmpresaSwitcherItem[] = [];

	for (const inc of incorporations) {
		const company = companyByIncorporation.get(inc.id) ?? null;
		items.push({
			id: inc.id,
			incorporation_id: inc.id,
			company_id: company?.id ?? null,
			nombre:
				company?.legal_name ??
				inc.principal_name ??
				inc.possible_names?.find(Boolean) ??
				'Empresa sin nombre',
			tipo_de_negocio: company?.entity_type ?? inc.entity_type ?? null,
			estado: inc.state ?? null,
			estado_de_incorporacion:
				pickStateName(company?.formation_state) ??
				pickStateName(inc.formation_state),
		});
	}

	// Empresas canónicas sin incorporación ligada: aparecen por `company_id`.
	const linkedCompanyIds = new Set(
		items.map((i) => i.company_id).filter(Boolean),
	);
	for (const c of companies) {
		if (linkedCompanyIds.has(c.id)) continue;
		items.push({
			id: c.id,
			incorporation_id: null,
			company_id: c.id,
			nombre: c.legal_name ?? 'Empresa sin nombre',
			tipo_de_negocio: c.entity_type ?? null,
			estado: c.legal_status ?? null,
			estado_de_incorporacion: pickStateName(c.formation_state),
		});
	}

	return items;
};

export interface ClientCompanyListItem {
	id: string;
	incorporation_id: string | null;
	legal_name: string | null;
	entity_type: string | null;
	legal_status: string | null;
	formation_state_name: string | null;
}

/** Empresas canónicas del usuario para el listado cliente `/company/`. */
export const getCompaniesByUserId = async (
	supabase: SupabaseClient,
	userId: string,
): Promise<ClientCompanyListItem[]> => {
	const { data, error } = await supabase
		.from('companies')
		.select(COMPANY_COLUMNS.WITH_STATE)
		.eq('user_id', userId)
		.order('updated_at', { ascending: false });

	if (error || !data) return [];

	return (data as unknown as CompanySwitcherRow[]).map((c) => ({
		id: c.id,
		incorporation_id: c.incorporation_id ?? null,
		legal_name: c.legal_name ?? null,
		entity_type: c.entity_type ?? null,
		legal_status: c.legal_status ?? null,
		formation_state_name: pickStateName(c.formation_state),
	}));
};

export const resolveActiveCompany = (
	empresas: EmpresaSwitcherItem[],
	cookieValue: string | undefined,
): EmpresaSwitcherItem | null => {
	if (empresas.length === 0) return null;
	if (cookieValue) {
		const match = empresas.find((e) => e.id === cookieValue);
		if (match) return match;
	}
	return empresas[0] ?? null;
};

// ── Admin empresa functions ──

interface CompanySwitcherRow extends Pick<
	CompanyRow,
	| 'id'
	| 'legal_name'
	| 'entity_type'
	| 'legal_status'
	| 'incorporation_id'
	| 'updated_at'
> {
	formation_state: { name: string } | { name: string }[] | null;
}

interface AdminEmpresaOwnerView {
	id: string;
	name: string;
	email: string;
	avatarUrl: string | null;
}

function buildAdminEmpresa(
	row: CompanyRow,
	stateName: string | null,
	incorporationId: string | null,
	owner: AdminEmpresaOwnerView | null,
): AdminEmpresa {
	return {
		id: row.id,
		legalName: row.legal_name ?? 'Sin nombre',
		entityType: (row.entity_type as EntityType | null) ?? null,
		formationState: stateName,
		filingNumber: row.filing_number,
		ein: row.identification_number,
		incorporationDate: row.incorporation_date,
		legalStatus: (row.legal_status as LegalStatus) ?? 'draft',
		taxClassification: row.tax_classification,
		managementType: row.management_type,
		usSourceIncome: !!row.us_source_income,
		owner,
		incorporationId,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
}

async function fetchStatesMap(
	supabase: SupabaseClient,
	stateIds: number[],
): Promise<Map<number, string>> {
	const map = new Map<number, string>();
	if (stateIds.length === 0) return map;
	const { data } = await supabase
		.from('states')
		.select('id, name')
		.in('id', stateIds);
	for (const s of data ?? []) {
		if (s.name) map.set(s.id, s.name);
	}
	return map;
}

async function fetchUsuariosByIds(
	supabase: SupabaseClient,
	userIds: string[],
): Promise<Map<string, UsuarioRow>> {
	if (userIds.length === 0) return new Map();
	const { data } = await supabase
		.from('usuarios')
		.select(USUARIO_COLUMNS.BASE)
		.in('user_id', userIds);
	return new Map((data ?? []).map((u) => [u.user_id, u]));
}

/**
 * Lista de empresas (entidades legales ya constituidas) para el panel admin.
 * Los owners se obtienen en una segunda query a `usuarios` indexada por Map
 * para evitar unions `T | T[]` del join embebido.
 */
export async function listAdminEmpresas(
	supabase: SupabaseClient,
): Promise<AdminEmpresa[]> {
	const { data: companies, error } = await supabase
		.from('companies')
		.select(COMPANY_COLUMNS.BASE)
		.order('created_at', { ascending: false });

	if (error) throw error;
	if (!companies) return [];

	const companyList = companies as CompanyRow[];

	const stateIds = Array.from(
		new Set(
			companyList
				.map((c) => c.formation_state_id)
				.filter((id): id is number => id !== null),
		),
	);
	const userIds = Array.from(
		new Set(
			companyList
				.map((c) => c.user_id)
				.filter((id): id is string => Boolean(id)),
		),
	);

	const [stateMap, usuariosById] = await Promise.all([
		fetchStatesMap(supabase, stateIds),
		fetchUsuariosByIds(supabase, userIds),
	]);

	const incorpByCompany = new Map<string, string>();
	for (const row of companyList) {
		if (row.incorporation_id) incorpByCompany.set(row.id, row.incorporation_id);
	}

	return companyList.map((row) => {
		let owner: AdminEmpresaOwnerView | null = null;
		if (row.user_id) {
			const u = usuariosById.get(row.user_id);
			owner = buildOwnerFromUsuario(
				u ?? {
					user_id: row.user_id,
					nombre: null,
					apellido: null,
					correo: null,
					avatar_url: null,
				},
			);
		}
		return buildAdminEmpresa(
			row,
			row.formation_state_id
				? (stateMap.get(row.formation_state_id) ?? null)
				: null,
			incorpByCompany.get(row.id) ?? null,
			owner,
		);
	});
}

/**
 * Detalle de una empresa para el panel admin: incluye miembros y direcciones.
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
				`id, percentage, is_manager, is_member, member:member_id(${MEMBER_COLUMNS.BASE})`,
			)
			.eq('company_id', id),
		supabase
			.from('company_addresses')
			.select('id, type, line1, city, zip, state_id, states:state_id(name)')
			.eq('company_id', id),
	]);

	const members: AdminEmpresaMember[] = (membersRows ?? []).map((row) => {
		const r = row as {
			id: number;
			percentage: number | null;
			is_manager: boolean | null;
			member: Array<{
				name: string | null;
				first_name: string | null;
				last_name: string | null;
			}> | null;
		};
		const m = takeOne(r.member);
		const fullName =
			m?.name ??
			([m?.first_name, m?.last_name].filter(Boolean).join(' ').trim() ||
				'Sin nombre');
		return {
			id: String(r.id),
			fullName,
			email: null,
			percentage: r.percentage,
			isManager: !!r.is_manager,
		};
	});

	const addresses = (addrRows ?? []).map((a) => {
		const r = a as {
			id: number;
			type: string | null;
			line1: string | null;
			city: string | null;
			zip: string | null;
			states: Array<{ name: string | null }> | null;
		};
		const st = takeOne(r.states);
		return {
			id: String(r.id),
			type: r.type,
			line1: r.line1,
			city: r.city,
			state: st?.name ?? null,
			zip: r.zip,
		};
	});

	return { ...base, members, addresses };
}
