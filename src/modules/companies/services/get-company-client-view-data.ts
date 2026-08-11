import type { SupabaseClient } from '@supabase/supabase-js';
import { getCurrentCompanyRegisteredAgent } from '@domains/companies/registered-agents';
import { getCurrentResponsibleParty } from '@domains/companies/responsible-party';
import type { DocumentDashboardRow } from '@domains/documents/document_dashboard';
import { COMPANY_COLUMNS } from '@domains/companies/types/company';
import type { MemberPersonType } from '@domains/members/types/member';
import type { CompanyAddressType } from '@domains/companies/types/company-address';

export interface ClientCompanyInfo {
	id: string;
	incorporation_id: string | null;
	legal_name: string | null;
	entity_type: string | null;
	identification_number: string | null;
	filing_number: string | null;
	incorporation_date: string | null;
	created_at: string | null;
	formation_state_name: string;
}

export interface ClientSocioItem {
	id: string;
	name: string;
	email: string | null;
	isManager: boolean;
	isMember: boolean;
	percentage: number | null;
	personType: MemberPersonType | null;
	isResponsibleParty: boolean;
}

export interface ClientAddressItem {
	id: number;
	type: CompanyAddressType;
	line1: string;
	line2: string | null;
	city: string;
	zip: string | null;
	stateName: string | null;
	countryName: string | null;
}

export interface ClientDocumentItem {
	id: string;
	title: string;
	typeName: string | null;
	date: string | null;
	status: string;
}

export interface CompanyClientViewData {
	company: ClientCompanyInfo | null;
	registeredAgentName: string | null;
	responsibleParty: { name: string | null; title: string | null } | null;
	socios: ClientSocioItem[];
	addresses: ClientAddressItem[];
	documents: ClientDocumentItem[];
	documentsTotal: number;
}

interface CompanyRowWithState {
	id: string;
	incorporation_id: string | null;
	legal_name: string | null;
	entity_type: string | null;
	identification_number: string | null;
	filing_number: string | null;
	incorporation_date: string | null;
	created_at: string | null;
	formation_state: { name: string } | { name: string }[] | null;
}

interface MemberRowJoined {
	id: string;
	is_manager: boolean;
	is_member: boolean;
	percentage: number | null;
	is_active: boolean | null;
	member: {
		id: string;
		first_name: string | null;
		last_name: string | null;
		name: string | null;
		person_type: MemberPersonType | null;
		user_id: string | null;
	} | { id: string; first_name: string | null; last_name: string | null; name: string | null; person_type: MemberPersonType | null; user_id: string | null }[];
}

interface AddressRowJoined {
	id: number;
	type: CompanyAddressType;
	line1: string;
	line2: string | null;
	city: string;
	zip: string | null;
	country: { name: string } | { name: string }[] | null;
	state_ref: { name: string } | { name: string }[] | null;
}

const pickName = (v: unknown): string | null => {
	if (!v) return null;
	const row = Array.isArray(v) ? v[0] : v;
	return (row as { name?: string } | null)?.name ?? null;
};

export async function getCompanyClientViewData(
	admin: SupabaseClient,
	companyId: string,
	_viewer: { userId: string; userRoles: string[] },
): Promise<CompanyClientViewData> {
	const { data: companyRow, error: companyError } = await admin
		.from('companies')
		.select(`${COMPANY_COLUMNS.BASE}, formation_state:formation_state_id(name)`)
		.eq('id', companyId)
		.maybeSingle<CompanyRowWithState>();

	if (companyError) throw companyError;

	if (!companyRow) {
		return {
			company: null,
			registeredAgentName: null,
			responsibleParty: null,
			socios: [],
			addresses: [],
			documents: [],
			documentsTotal: 0,
		};
	}

	const incorporationId = companyRow.incorporation_id;

	const [membersResult, addressesResult, agent, responsible, allDocuments] =
		await Promise.all([
			admin
				.from('company_members')
				.select(
					`id, is_manager, is_member, percentage, is_active,
					 member:member_id ( id, first_name, last_name, name, person_type, user_id )`,
				)
				.eq('company_id', companyId)
				.order('created_at', { ascending: true }),
			admin
				.from('company_addresses')
				.select(
					`id, type, line1, line2, city, zip,
					 country:country_id ( name ), state_ref:state_id ( name )`,
				)
				.eq('company_id', companyId)
				.order('created_at', { ascending: true }),
			getCurrentCompanyRegisteredAgent(admin, companyId).catch(() => null),
			getCurrentResponsibleParty(admin, companyId).catch(() => null),
			Promise.resolve([] as DocumentDashboardRow[]),
		]);

	if (membersResult.error) throw membersResult.error;
	if (addressesResult.error) throw addressesResult.error;

	const memberRows = (membersResult.data ?? []).filter(
		(r: MemberRowJoined) => r.is_active !== false && r.member,
	);

	const userIds = [
		...new Set(
			memberRows
				.map((r: MemberRowJoined) =>
					Array.isArray(r.member) ? r.member[0] : r.member,
				)
				.map((m) => m?.user_id)
				.filter(Boolean),
		),
	] as string[];

	const emails = new Map<string, string>();
	if (userIds.length) {
		const { data: users } = await admin
			.from('usuarios')
			.select('user_id, correo')
			.in('user_id', userIds);
		for (const u of users ?? []) {
			emails.set(u.user_id as string, u.correo as string);
		}
	}

	const socios: ClientSocioItem[] = memberRows.map((r: MemberRowJoined) => {
		const m = Array.isArray(r.member) ? r.member[0] : r.member;
		const fullName =
			[m?.first_name, m?.last_name].filter(Boolean).join(' ').trim() ||
			m?.name ||
			'Socio';
		return {
			id: m?.id ?? String(r.id),
			name: fullName,
			email: m?.user_id ? (emails.get(m.user_id) ?? null) : null,
			isManager: !!r.is_manager,
			isMember: !!r.is_member,
			percentage: r.percentage != null ? Number(r.percentage) : null,
			personType: m?.person_type ?? null,
			isResponsibleParty: responsible?.member_id === m?.id,
		};
	});

	const addresses: ClientAddressItem[] = (addressesResult.data ?? []).map(
		(a: AddressRowJoined) => ({
			id: a.id,
			type: a.type,
			line1: a.line1,
			line2: a.line2 ?? null,
			city: a.city,
			zip: a.zip ?? null,
			stateName: pickName(a.state_ref),
			countryName: pickName(a.country),
		}),
	);

	const documents: ClientDocumentItem[] = allDocuments.slice(0, 5).map((d) => ({
		id: d.id,
		title: d.file_title || d.file_name,
		typeName: d.document_type?.name ?? null,
		date: d.uploaded_at ?? d.created_at,
		status: d.status,
	}));

	return {
		company: {
			id: companyId,
			incorporation_id: incorporationId,
			legal_name: companyRow.legal_name,
			entity_type: companyRow.entity_type,
			identification_number: companyRow.identification_number,
			filing_number: companyRow.filing_number,
			incorporation_date: companyRow.incorporation_date,
			created_at: companyRow.created_at,
			formation_state_name: pickName(companyRow.formation_state) ?? '',
		},
		registeredAgentName:
			agent?.agent?.agent_name ?? agent?.full_legal_name ?? null,
		responsibleParty: responsible
			? {
					name: responsible.member?.full_name ?? null,
					title: responsible.title,
				}
			: null,
		socios,
		addresses,
		documents,
		documentsTotal: allDocuments.length,
	};
}
