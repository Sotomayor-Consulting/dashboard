import type { SupabaseClient } from '@supabase/supabase-js';
import { recordAuditEvent } from '@domains/audit/audit-events';

export type MemberAddressType = 'tax' | 'residence' | 'mailing' | 'other';

export interface MemberAddressInput {
	type?: MemberAddressType;
	line1?: string | null;
	line2?: string | null;
	city?: string | null;
	state_id?: number | null;
	state?: string | null;
	country_id?: number | null;
	zip?: string | null;
	is_primary?: boolean;
}

export interface MemberAddressRow {
	id: number;
	member_id: string;
	type: MemberAddressType;
	line1: string;
	line2: string | null;
	city: string | null;
	state_id: number | null;
	state: string | null;
	country_id: number | null;
	zip: string | null;
	is_primary: boolean;
	created_at: string;
	created_by: string | null;
	updated_at: string | null;
	updated_by: string | null;
	deleted_at: string | null;
	deleted_by: string | null;
	delete_reason: string | null;
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
	'tax',
	'residence',
	'mailing',
	'other',
];

const addressPayload = (
	input: MemberAddressInput,
	memberId: string,
	actorUserId: string,
) => {
	const type = (input.type ?? 'tax') as MemberAddressType;
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
		state: cleanText(input.state),
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

async function getActiveAddress(
	supabase: SupabaseClient,
	memberId: string,
	addressId: number,
) {
	const { data, error } = await supabase
		.from('member_addresses')
		.select('*')
		.eq('id', addressId)
		.eq('member_id', memberId)
		.is('deleted_at', null)
		.maybeSingle<MemberAddressRow>();
	if (error) throw error;
	return data ?? null;
}

/**
 * Si la nueva direccion se marca primaria, quita el flag de las otras del
 * mismo tipo (manteniendo el unique index).
 */
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
		.eq('is_primary', true)
		.is('deleted_at', null);

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
		.is('deleted_at', null)
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
		await unsetOtherPrimaries(
			supabase,
			memberId,
			payload.type,
			null,
			actorUserId,
		);
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
	const before = await getActiveAddress(supabase, memberId, addressId);
	if (!before) throw new Error('MEMBER_ADDRESS_NOT_FOUND');

	const payload = addressPayload(input, memberId, actorUserId);
	if (!payload.line1) throw new Error('ADDRESS_LINE1_REQUIRED');

	if (payload.is_primary) {
		await unsetOtherPrimaries(
			supabase,
			memberId,
			payload.type,
			addressId,
			actorUserId,
		);
	}

	const { data, error } = await supabase
		.from('member_addresses')
		.update(payload)
		.eq('id', addressId)
		.eq('member_id', memberId)
		.is('deleted_at', null)
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

export async function softDeleteMemberAddress(
	supabase: SupabaseClient,
	memberId: string,
	addressId: number,
	actorUserId: string,
	reason: string | null,
) {
	const before = await getActiveAddress(supabase, memberId, addressId);
	if (!before) throw new Error('MEMBER_ADDRESS_NOT_FOUND');

	const deletedAt = new Date().toISOString();
	const { data, error } = await supabase
		.from('member_addresses')
		.update({
			deleted_at: deletedAt,
			deleted_by: actorUserId,
			delete_reason: cleanText(reason) ?? 'Deleted from member edit',
			updated_at: deletedAt,
			updated_by: actorUserId,
		})
		.eq('id', addressId)
		.select('*')
		.single<MemberAddressRow>();
	if (error) throw error;

	await recordAuditEvent({
		entityType: 'member_address',
		entityId: String(addressId),
		parentType: 'member',
		parentId: memberId,
		action: 'soft_delete',
		changedBy: actorUserId,
		beforeData: before,
		afterData: data,
	});

	return data;
}
