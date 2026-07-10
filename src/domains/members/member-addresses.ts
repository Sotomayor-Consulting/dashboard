import type { SupabaseClient } from '@supabase/supabase-js';
import { recordAuditEvent } from '@domains/audit/audit-events';
import type { MemberAddressType, MemberAddressRow } from '@domains/members/types/member-address';

export interface MemberAddressInput {
	type?: MemberAddressType;
	line1?: string | null;
	line2?: string | null;
	city?: string | null;
	state_id?: number | null;
	country_id?: number | null;
	zip?: string | null;
	is_primary?: boolean;
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

const ALLOWED_TYPES: MemberAddressType[] = [
	'residential',
	'mailing',
	'business',
	'other',
];

const addressPayload = (
	input: MemberAddressInput,
	memberId: string,
	actorUserId: string,
) => {
	const type = (input.type ?? 'residential') as MemberAddressType;
	if (!ALLOWED_TYPES.includes(type)) {
		throw new Error('ADDRESS_TYPE_INVALID');
	}
	return {
		member_id: memberId,
		type,
		line1: cleanText(input.line1),
		line2: cleanText(input.line2),
		city: cleanText(input.city),
		state_id: cleanNumber(input.state_id),
		country_id: cleanNumber(input.country_id),
		zip: cleanText(input.zip),
		is_primary: input.is_primary ?? false,
		updated_at: new Date().toISOString(),
		updated_by: actorUserId,
	};
};

async function assertMemberExists(supabase: SupabaseClient, memberId: string) {
	const { data, error } = await supabase
		.from('members')
		.select('id')
		.eq('id', memberId)
		.maybeSingle();
	if (error) throw error;
	if (!data) throw new Error('MEMBER_NOT_FOUND');
}

async function getAddress(
	supabase: SupabaseClient,
	memberId: string,
	addressId: number,
) {
	const { data, error } = await supabase
		.from('member_addresses')
		.select('*')
		.eq('id', addressId)
		.eq('member_id', memberId)
		.maybeSingle<MemberAddressRow>();
	if (error) throw error;
	return data ?? null;
}

async function unsetOtherPrimaries(
	supabase: SupabaseClient,
	memberId: string,
	type: MemberAddressType,
	excludeId: number | null,
	actorUserId: string,
) {
	let query = supabase
		.from('member_addresses')
		.update({
			is_primary: false,
			updated_at: new Date().toISOString(),
			updated_by: actorUserId,
		})
		.eq('member_id', memberId)
		.eq('type', type)
		.eq('is_primary', true);

	if (excludeId !== null) {
		query = query.neq('id', excludeId);
	}
	const { error } = await query;
	if (error) throw error;
}

export async function listMemberAddresses(
	supabase: SupabaseClient,
	memberId: string,
): Promise<MemberAddressRow[]> {
	await assertMemberExists(supabase, memberId);
	const { data, error } = await supabase
		.from('member_addresses')
		.select('*')
		.eq('member_id', memberId)
		.order('is_primary', { ascending: false })
		.order('created_at', { ascending: true });
	if (error) throw error;
	return (data ?? []) as MemberAddressRow[];
}

export async function createMemberAddress(
	supabase: SupabaseClient,
	memberId: string,
	input: MemberAddressInput,
	actorUserId: string,
) {
	await assertMemberExists(supabase, memberId);
	const payload = addressPayload(input, memberId, actorUserId);
	if (!payload.line1) throw new Error('ADDRESS_LINE1_REQUIRED');

	if (payload.is_primary) {
		await unsetOtherPrimaries(supabase, memberId, payload.type, null, actorUserId);
	}

	const { data, error } = await supabase
		.from('member_addresses')
		.insert({ ...payload, created_by: actorUserId })
		.select('*')
		.single<MemberAddressRow>();
	if (error) throw error;

	await recordAuditEvent({
		entityType: 'member_address',
		entityId: String(data.id),
		parentType: 'member',
		parentId: memberId,
		action: 'create',
		changedBy: actorUserId,
		afterData: data,
	});

	return data;
}

export async function updateMemberAddress(
	supabase: SupabaseClient,
	memberId: string,
	addressId: number,
	input: MemberAddressInput,
	actorUserId: string,
) {
	const before = await getAddress(supabase, memberId, addressId);
	if (!before) throw new Error('MEMBER_ADDRESS_NOT_FOUND');

	const payload = addressPayload(input, memberId, actorUserId);
	if (!payload.line1) throw new Error('ADDRESS_LINE1_REQUIRED');

	if (payload.is_primary) {
		await unsetOtherPrimaries(supabase, memberId, payload.type, addressId, actorUserId);
	}

	const { data, error } = await supabase
		.from('member_addresses')
		.update(payload)
		.eq('id', addressId)
		.eq('member_id', memberId)
		.select('*')
		.single<MemberAddressRow>();
	if (error) throw error;

	await recordAuditEvent({
		entityType: 'member_address',
		entityId: String(addressId),
		parentType: 'member',
		parentId: memberId,
		action: 'update',
		changedBy: actorUserId,
		beforeData: before,
		afterData: data,
	});

	return data;
}

export async function deleteMemberAddress(
	supabase: SupabaseClient,
	memberId: string,
	addressId: number,
	actorUserId: string,
) {
	const before = await getAddress(supabase, memberId, addressId);
	if (!before) throw new Error('MEMBER_ADDRESS_NOT_FOUND');

	const { error } = await supabase
		.from('member_addresses')
		.delete()
		.eq('id', addressId)
		.eq('member_id', memberId);
	if (error) throw error;

	await recordAuditEvent({
		entityType: 'member_address',
		entityId: String(addressId),
		parentType: 'member',
		parentId: memberId,
		action: 'soft_delete',
		changedBy: actorUserId,
		beforeData: before,
		afterData: null,
	});

	return before;
}
