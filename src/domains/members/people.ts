import type { SupabaseClient } from '@supabase/supabase-js';
import { recordAuditEvent } from '@domains/audit/audit-events';

export type MemberPersonType = 'natural_person' | 'juridical_person';

export type MemberIdentificationType =
	| 'passport'
	| 'national_id'
	| 'driver_licence'
	| 'ein';

export type MemberMaritalStatus =
	| 'single'
	| 'married'
	| 'widowed'
	| 'divorced'
	| 'legally_separated'
	| 'civil_union'
	| 'annulled';

export interface MemberRow {
	id: string;
	first_name: string | null;
	last_name: string | null;
	full_name: string | null;
	name: string | null;
	birth_date: string | null;
	incorporation_date: string | null;
	person_type: MemberPersonType;
	identification_number: string | null;
	identification_type: MemberIdentificationType;
	country_nationality_id: number | null;
	country_residence_id: number | null;
	country_id: number | null;
	marital_status: MemberMaritalStatus | null;
	ssn: string | null;
	itin: string | null;
	user_id: string | null;
	is_member: boolean | null;
	is_manager: boolean | null;
	created_at: string;
}

export interface MemberInput {
	first_name?: string | null;
	last_name?: string | null;
	full_name?: string | null;
	name?: string | null;
	birth_date?: string | null;
	incorporation_date?: string | null;
	person_type?: MemberPersonType;
	identification_number?: string | null;
	identification_type?: MemberIdentificationType;
	country_nationality_id?: number | null;
	country_residence_id?: number | null;
	country_id?: number | null;
	marital_status?: MemberMaritalStatus | null;
	ssn?: string | null;
	itin?: string | null;
	is_member?: boolean | null;
	is_manager?: boolean | null;
}

export const MEMBER_COLUMNS =
	'id, first_name, last_name, full_name, name, birth_date, incorporation_date, person_type, identification_number, identification_type, country_nationality_id, country_residence_id, country_id, marital_status, ssn, itin, user_id, is_member, is_manager, created_at';

const cleanText = (value: unknown) => {
	if (typeof value !== 'string') return null;
	const trimmed = value.trim();
	return trimmed ? trimmed : null;
};

const cleanNumber = (value: unknown) => {
	if (typeof value === 'number' && Number.isFinite(value)) return value;
	if (typeof value !== 'string' || value.trim() === '') return null;
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : null;
};

const cleanDate = (value: unknown) => {
	const text = cleanText(value);
	if (!text) return null;
	const parsed = new Date(text);
	return Number.isNaN(parsed.getTime()) ? null : text;
};

const composeFullName = (
	first: string | null,
	last: string | null,
	fallback: string | null,
) => {
	const composed = [first, last].filter(Boolean).join(' ').trim();
	if (composed) return composed;
	return cleanText(fallback);
};

const memberPayload = (input: MemberInput) => {
	const personType: MemberPersonType = input.person_type ?? 'natural_person';
	const idType: MemberIdentificationType =
		input.identification_type ?? (personType === 'juridical_person' ? 'ein' : 'passport');

	const firstName = cleanText(input.first_name);
	const lastName = cleanText(input.last_name);
	const entityName = cleanText(input.name);

	const fullName =
		personType === 'juridical_person'
			? entityName
			: composeFullName(firstName, lastName, input.full_name ?? null);

	return {
		first_name: firstName,
		last_name: lastName,
		full_name: fullName,
		name: entityName,
		birth_date: cleanDate(input.birth_date),
		incorporation_date: cleanDate(input.incorporation_date),
		person_type: personType,
		identification_number: cleanText(input.identification_number),
		identification_type: idType,
		country_nationality_id: cleanNumber(input.country_nationality_id),
		country_residence_id: cleanNumber(input.country_residence_id),
		country_id: cleanNumber(input.country_id),
		marital_status: (input.marital_status as MemberMaritalStatus) ?? null,
		ssn: cleanText(input.ssn),
		itin: cleanText(input.itin),
		is_member: input.is_member ?? null,
		is_manager: input.is_manager ?? null,
	};
};

/**
 * Búsqueda paginada de personas (registro maestro). Filtra por nombre o número de identificación.
 */
export async function searchMembers(
	supabase: SupabaseClient,
	options: { query?: string; limit?: number } = {},
): Promise<MemberRow[]> {
	const limit = Math.min(Math.max(options.limit ?? 20, 1), 50);
	const term = cleanText(options.query);

	let queryBuilder = supabase
		.from('members')
		.select(MEMBER_COLUMNS)
		.order('created_at', { ascending: false })
		.limit(limit);

	if (term) {
		const escaped = term.replace(/[%_]/g, (match) => `\\${match}`);
		queryBuilder = queryBuilder.or(
			`full_name.ilike.%${escaped}%,first_name.ilike.%${escaped}%,last_name.ilike.%${escaped}%,name.ilike.%${escaped}%,identification_number.ilike.%${escaped}%`,
		);
	}

	const { data, error } = await queryBuilder;
	if (error) throw error;
	return (data ?? []) as MemberRow[];
}

export async function getMemberById(
	supabase: SupabaseClient,
	memberId: string,
): Promise<MemberRow | null> {
	const { data, error } = await supabase
		.from('members')
		.select(MEMBER_COLUMNS)
		.eq('id', memberId)
		.maybeSingle<MemberRow>();

	if (error) throw error;
	return data ?? null;
}

/**
 * Crea un nuevo registro en members (datos maestros). No crea relación con empresa.
 */
export async function createMember(
	supabase: SupabaseClient,
	input: MemberInput,
	actorUserId: string,
): Promise<MemberRow> {
	const payload = memberPayload(input);
	if (!payload.full_name) {
		throw new Error('MEMBER_FULL_NAME_REQUIRED');
	}

	const { data, error } = await supabase
		.from('members')
		.insert(payload)
		.select(MEMBER_COLUMNS)
		.single<MemberRow>();

	if (error) throw error;

	await recordAuditEvent({
		entityType: 'member',
		entityId: String(data.id),
		action: 'create',
		changedBy: actorUserId,
		afterData: data,
	});

	return data;
}

export async function updateMember(
	supabase: SupabaseClient,
	memberId: string,
	input: MemberInput,
	actorUserId: string,
): Promise<MemberRow> {
	const before = await getMemberById(supabase, memberId);
	if (!before) throw new Error('MEMBER_NOT_FOUND');

	const payload = memberPayload(input);
	if (!payload.full_name) {
		throw new Error('MEMBER_FULL_NAME_REQUIRED');
	}

	const { data, error } = await supabase
		.from('members')
		.update(payload)
		.eq('id', memberId)
		.select(MEMBER_COLUMNS)
		.single<MemberRow>();

	if (error) throw error;

	await recordAuditEvent({
		entityType: 'member',
		entityId: String(data.id),
		action: 'update',
		changedBy: actorUserId,
		beforeData: before,
		afterData: data,
	});

	return data;
}
