import type { SupabaseClient } from '@supabase/supabase-js';
import { recordAuditEvent } from '@domains/audit/audit-events';
import type { MemberRow } from '@domains/members/types/member';
import type { MemberPersonType, MemberIdentificationType, MemberMaritalStatusType } from '@domains/members/types/member';
import { MEMBER_COLUMNS as COLUMNS } from '@domains/members/types/member';

const MEMBER_COLUMNS = COLUMNS.BASE;

export interface MemberInput {
	first_name?: string | null;
	last_name?: string | null;
	name?: string | null;
	birth_date?: string | null;
	incorporation_date?: string | null;
	person_type?: MemberPersonType;
	identification_number?: string | null;
	identification_type?: MemberIdentificationType;
	country_nationality_id?: number | null;
	country_residence_id?: number | null;
	country_id?: number | null;
	marital_status?: MemberMaritalStatusType | null;
	ssn?: string | null;
	itin?: string | null;
}


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

const memberPayload = (input: MemberInput) => {
	const personType: MemberPersonType = input.person_type ?? 'individual';
	const idType: MemberIdentificationType =
		input.identification_type ?? (personType === 'entity' ? 'ein' : 'passport');

	const firstName = cleanText(input.first_name);
	const lastName = cleanText(input.last_name);
	const entityName = cleanText(input.name);

	return {
		first_name: firstName,
		last_name: lastName,
		name: entityName,
		birth_date: cleanDate(input.birth_date),
		incorporation_date: cleanDate(input.incorporation_date),
		person_type: personType,
		identification_number: cleanText(input.identification_number),
		identification_type: idType,
		country_nationality_id: cleanNumber(input.country_nationality_id),
		country_residence_id: cleanNumber(input.country_residence_id),
		country_id: cleanNumber(input.country_id),
		marital_status: (input.marital_status as MemberMaritalStatusType) ?? null,
		ssn: cleanText(input.ssn),
		itin: cleanText(input.itin),
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
	let queryBuilder = supabase
		.from('members')
		.select(MEMBER_COLUMNS)
		.order('created_at', { ascending: false })
		.limit(limit);
	const { data, error } = await queryBuilder;
	if (error) throw error;
	return data ?? [];
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
	if (!payload.first_name && !payload.last_name && !payload.name) {
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
	if (!payload.first_name && !payload.last_name && !payload.name) {
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
