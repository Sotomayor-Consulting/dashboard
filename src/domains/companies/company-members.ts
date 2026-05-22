import type { SupabaseClient } from '@supabase/supabase-js';
import { recordAuditEvent } from '@domains/audit/audit-events';

export type CompanyMemberAddressType = 'tax' | 'residence' | 'mailing' | 'other';

export interface CompanyMemberAddressInput {
	type?: CompanyMemberAddressType;
	line1?: string | null;
	line2?: string | null;
	city?: string | null;
	state_id?: number | null;
	state?: string | null;
	country_id?: number | null;
	zip?: string | null;
	is_primary?: boolean;
}

export interface CompanyMemberInput {
	full_name?: string | null;
	email?: string | null;
	member_type?: string | null;
	country_nationality_id?: number | null;
	marital_status?: string | null;
	is_us_tax_resident?: boolean | null;
	passport_number?: string | null;
	ssn?: string | null;
	itin?: string | null;
	percentage?: number | null;
	is_member?: boolean;
	is_manager?: boolean;
	tax_address?: CompanyMemberAddressInput | null;
}

export interface CompanyMemberAddressRow {
	id: number;
	company_member_id: number;
	type: CompanyMemberAddressType;
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

export interface CompanyMemberRow {
	id: number;
	company_id: string;
	full_name: string | null;
	email: string | null;
	member_type: string | null;
	country_nationality_id: number | null;
	marital_status: string | null;
	is_us_tax_resident: boolean | null;
	passport_number: string | null;
	ssn: string | null;
	itin: string | null;
	is_member: boolean | null;
	is_manager: boolean | null;
	percentage: number | null;
	start_date: string | null;
	end_date: string | null;
	is_active: boolean | null;
	created_by: string | null;
	created_at: string;
	updated_by: string | null;
	updated_at: string | null;
	deleted_at: string | null;
	deleted_by: string | null;
	delete_reason: string | null;
	tax_address?: CompanyMemberAddressRow | null;
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

const memberPayload = (input: CompanyMemberInput) => ({
	full_name: cleanText(input.full_name),
	email: cleanText(input.email)?.toLowerCase() ?? null,
	member_type: cleanText(input.member_type),
	country_nationality_id: cleanNumber(input.country_nationality_id),
	marital_status: cleanText(input.marital_status),
	is_us_tax_resident: input.is_us_tax_resident ?? null,
	passport_number: cleanText(input.passport_number),
	ssn: cleanText(input.ssn),
	itin: cleanText(input.itin),
	percentage: cleanNumber(input.percentage),
	is_member: input.is_member ?? true,
	is_manager: input.is_manager ?? false,
	is_active: true,
});

const addressPayload = (
	input: CompanyMemberAddressInput,
	companyMemberId: number,
	actorUserId: string,
) => ({
	company_member_id: companyMemberId,
	type: input.type ?? 'tax',
	line1: cleanText(input.line1),
	line2: cleanText(input.line2),
	city: cleanText(input.city),
	state_id: cleanNumber(input.state_id),
	state: cleanText(input.state),
	country_id: cleanNumber(input.country_id),
	zip: cleanText(input.zip),
	is_primary: input.is_primary ?? true,
	updated_at: new Date().toISOString(),
	updated_by: actorUserId,
});

export async function listCompanyMembers(
	supabase: SupabaseClient,
	companyId: string,
): Promise<CompanyMemberRow[]> {
	const { data: members, error } = await supabase
		.from('company_members')
		.select('*')
		.eq('company_id', companyId)
		.is('deleted_at', null)
		.order('created_at', { ascending: true });

	if (error) throw error;
	if (!members?.length) return [];

	const memberIds = members.map((member) => Number(member.id));
	const { data: addresses, error: addressesError } = await supabase
		.from('company_member_addresses')
		.select('*')
		.in('company_member_id', memberIds)
		.eq('type', 'tax')
		.eq('is_primary', true)
		.is('deleted_at', null);

	if (addressesError) throw addressesError;

	const addressesByMember = new Map<number, CompanyMemberAddressRow>();
	for (const address of (addresses ?? []) as CompanyMemberAddressRow[]) {
		addressesByMember.set(Number(address.company_member_id), address);
	}

	return (members as CompanyMemberRow[]).map((member) => ({
		...member,
		tax_address: addressesByMember.get(Number(member.id)) ?? null,
	}));
}

export async function listCompanyMemberAddresses(
	supabase: SupabaseClient,
	companyId: string,
	memberId: number,
): Promise<CompanyMemberAddressRow[]> {
	await assertCompanyMemberExists(supabase, companyId, memberId);

	const { data, error } = await supabase
		.from('company_member_addresses')
		.select('*')
		.eq('company_member_id', memberId)
		.is('deleted_at', null)
		.order('created_at', { ascending: true });

	if (error) throw error;
	return (data ?? []) as CompanyMemberAddressRow[];
}

export async function createCompanyMemberAddress(
	supabase: SupabaseClient,
	companyId: string,
	memberId: number,
	input: CompanyMemberAddressInput,
	actorUserId: string,
) {
	await assertCompanyMemberExists(supabase, companyId, memberId);
	const payload = addressPayload(input, memberId, actorUserId);
	if (!payload.line1) throw new Error('ADDRESS_LINE1_REQUIRED');

	const { data, error } = await supabase
		.from('company_member_addresses')
		.insert({
			...payload,
			created_by: actorUserId,
		})
		.select('*')
		.single<CompanyMemberAddressRow>();

	if (error) throw error;

	await recordAuditEvent({
		entityType: 'company_member_address',
		entityId: String(data.id),
		parentType: 'company_member',
		parentId: String(memberId),
		action: 'create',
		changedBy: actorUserId,
		afterData: data,
	});

	return data;
}

export async function updateCompanyMemberAddress(
	supabase: SupabaseClient,
	companyId: string,
	memberId: number,
	addressId: number,
	input: CompanyMemberAddressInput,
	actorUserId: string,
) {
	const before = await getActiveCompanyMemberAddress(
		supabase,
		companyId,
		memberId,
		addressId,
	);
	if (!before) throw new Error('COMPANY_MEMBER_ADDRESS_NOT_FOUND');

	const payload = addressPayload(input, memberId, actorUserId);
	if (!payload.line1) throw new Error('ADDRESS_LINE1_REQUIRED');

	const { data, error } = await supabase
		.from('company_member_addresses')
		.update(payload)
		.eq('id', addressId)
		.eq('company_member_id', memberId)
		.is('deleted_at', null)
		.select('*')
		.single<CompanyMemberAddressRow>();

	if (error) throw error;

	await recordAuditEvent({
		entityType: 'company_member_address',
		entityId: String(addressId),
		parentType: 'company_member',
		parentId: String(memberId),
		action: 'update',
		changedBy: actorUserId,
		beforeData: before,
		afterData: data,
	});

	return data;
}

export async function softDeleteCompanyMemberAddress(
	supabase: SupabaseClient,
	companyId: string,
	memberId: number,
	addressId: number,
	actorUserId: string,
	reason: string | null,
) {
	const before = await getActiveCompanyMemberAddress(
		supabase,
		companyId,
		memberId,
		addressId,
	);
	if (!before) throw new Error('COMPANY_MEMBER_ADDRESS_NOT_FOUND');

	return softDeleteCompanyMemberAddressById(
		supabase,
		addressId,
		actorUserId,
		cleanText(reason) ?? 'Deleted from member details',
	);
}

export async function createCompanyMember(
	supabase: SupabaseClient,
	companyId: string,
	input: CompanyMemberInput,
	actorUserId: string,
) {
	const now = new Date().toISOString();
	const payload = {
		...memberPayload(input),
		company_id: companyId,
		created_by: actorUserId,
		updated_by: actorUserId,
		created_at: now,
		updated_at: now,
	};

	const { data: member, error } = await supabase
		.from('company_members')
		.insert(payload)
		.select('*')
		.single<CompanyMemberRow>();

	if (error) throw error;

	let taxAddress: CompanyMemberAddressRow | null = null;
	if (input.tax_address?.line1) {
		taxAddress = await upsertPrimaryTaxAddress(
			supabase,
			member.id,
			input.tax_address,
			actorUserId,
		);
	}

	const afterData = { ...member, tax_address: taxAddress };
	await recordAuditEvent({
		entityType: 'company_member',
		entityId: String(member.id),
		parentType: 'company',
		parentId: companyId,
		action: 'create',
		changedBy: actorUserId,
		afterData,
	});

	if (taxAddress) {
		await recordAuditEvent({
			entityType: 'company_member_address',
			entityId: String(taxAddress.id),
			parentType: 'company_member',
			parentId: String(member.id),
			action: 'create',
			changedBy: actorUserId,
			afterData: taxAddress,
		});
	}

	return afterData;
}

export async function updateCompanyMember(
	supabase: SupabaseClient,
	companyId: string,
	memberId: number,
	input: CompanyMemberInput,
	actorUserId: string,
) {
	const before = await getCompanyMemberWithTaxAddress(
		supabase,
		memberId,
		companyId,
	);
	if (!before) throw new Error('COMPANY_MEMBER_NOT_FOUND');

	const { data: member, error } = await supabase
		.from('company_members')
		.update({
			...memberPayload(input),
			updated_at: new Date().toISOString(),
			updated_by: actorUserId,
		})
		.eq('id', memberId)
		.eq('company_id', companyId)
		.is('deleted_at', null)
		.select('*')
		.single<CompanyMemberRow>();

	if (error) throw error;

	let taxAddress: CompanyMemberAddressRow | null = null;
	if (input.tax_address?.line1) {
		taxAddress = await upsertPrimaryTaxAddress(
			supabase,
			member.id,
			input.tax_address,
			actorUserId,
		);
	} else if (before.tax_address) {
		await softDeleteCompanyMemberAddressById(
			supabase,
			before.tax_address.id,
			actorUserId,
			'Address cleared from member form',
		);
	}

	const after = {
		...member,
		tax_address: taxAddress,
	};

	await recordAuditEvent({
		entityType: 'company_member',
		entityId: String(member.id),
		parentType: 'company',
		parentId: member.company_id,
		action: 'update',
		changedBy: actorUserId,
		beforeData: before,
		afterData: after,
	});

	return after;
}

export async function softDeleteCompanyMember(
	supabase: SupabaseClient,
	companyId: string,
	memberId: number,
	actorUserId: string,
	reason: string | null,
) {
	const before = await getCompanyMemberWithTaxAddress(
		supabase,
		memberId,
		companyId,
	);
	if (!before) throw new Error('COMPANY_MEMBER_NOT_FOUND');

	const deletedAt = new Date().toISOString();
	const { data: member, error } = await supabase
		.from('company_members')
		.update({
			deleted_at: deletedAt,
			deleted_by: actorUserId,
			delete_reason: cleanText(reason) ?? null,
			is_active: false,
			updated_at: deletedAt,
			updated_by: actorUserId,
		})
		.eq('id', memberId)
		.eq('company_id', companyId)
		.is('deleted_at', null)
		.select('*')
		.single<CompanyMemberRow>();

	if (error) throw error;

	await supabase
		.from('company_member_addresses')
		.update({
			deleted_at: deletedAt,
			deleted_by: actorUserId,
			delete_reason: cleanText(reason) ?? 'Member deleted',
			updated_at: deletedAt,
			updated_by: actorUserId,
		})
		.eq('company_member_id', memberId)
		.is('deleted_at', null);

	await recordAuditEvent({
		entityType: 'company_member',
		entityId: String(member.id),
		parentType: 'company',
		parentId: member.company_id,
		action: 'soft_delete',
		changedBy: actorUserId,
		beforeData: before,
		afterData: member,
	});

	return member;
}

async function getCompanyMemberWithTaxAddress(
	supabase: SupabaseClient,
	memberId: number,
	companyId?: string,
): Promise<CompanyMemberRow | null> {
	let query = supabase
		.from('company_members')
		.select('*')
		.eq('id', memberId)
		.is('deleted_at', null);

	if (companyId) query = query.eq('company_id', companyId);

	const { data: member, error } = await query.maybeSingle<CompanyMemberRow>();

	if (error) throw error;
	if (!member) return null;

	const { data: address, error: addressError } = await supabase
		.from('company_member_addresses')
		.select('*')
		.eq('company_member_id', memberId)
		.eq('type', 'tax')
		.eq('is_primary', true)
		.is('deleted_at', null)
		.maybeSingle<CompanyMemberAddressRow>();

	if (addressError) throw addressError;

	return {
		...member,
		tax_address: address ?? null,
	};
}

async function assertCompanyMemberExists(
	supabase: SupabaseClient,
	companyId: string,
	memberId: number,
) {
	const { data, error } = await supabase
		.from('company_members')
		.select('id')
		.eq('id', memberId)
		.eq('company_id', companyId)
		.is('deleted_at', null)
		.maybeSingle();

	if (error) throw error;
	if (!data) throw new Error('COMPANY_MEMBER_NOT_FOUND');
}

async function getActiveCompanyMemberAddress(
	supabase: SupabaseClient,
	companyId: string,
	memberId: number,
	addressId: number,
) {
	await assertCompanyMemberExists(supabase, companyId, memberId);

	const { data, error } = await supabase
		.from('company_member_addresses')
		.select('*')
		.eq('id', addressId)
		.eq('company_member_id', memberId)
		.is('deleted_at', null)
		.maybeSingle<CompanyMemberAddressRow>();

	if (error) throw error;
	return data ?? null;
}

async function upsertPrimaryTaxAddress(
	supabase: SupabaseClient,
	memberId: number,
	input: CompanyMemberAddressInput,
	actorUserId: string,
) {
	const payload = addressPayload(
		{ ...input, type: 'tax', is_primary: true },
		memberId,
		actorUserId,
	);

	if (!payload.line1) return null;

	const { data: existing, error: existingError } = await supabase
		.from('company_member_addresses')
		.select('*')
		.eq('company_member_id', memberId)
		.eq('type', 'tax')
		.eq('is_primary', true)
		.is('deleted_at', null)
		.maybeSingle<CompanyMemberAddressRow>();

	if (existingError) throw existingError;

	if (existing) {
		const { data, error } = await supabase
			.from('company_member_addresses')
			.update(payload)
			.eq('id', existing.id)
			.select('*')
			.single<CompanyMemberAddressRow>();

		if (error) throw error;

		await recordAuditEvent({
			entityType: 'company_member_address',
			entityId: String(data.id),
			parentType: 'company_member',
			parentId: String(memberId),
			action: 'update',
			changedBy: actorUserId,
			beforeData: existing,
			afterData: data,
		});

		return data;
	}

	const { data, error } = await supabase
		.from('company_member_addresses')
		.insert({
			...payload,
			created_by: actorUserId,
		})
		.select('*')
		.single<CompanyMemberAddressRow>();

	if (error) throw error;
	return data;
}

async function softDeleteCompanyMemberAddressById(
	supabase: SupabaseClient,
	addressId: number,
	actorUserId: string,
	reason: string,
): Promise<CompanyMemberAddressRow | null> {
	const { data: before, error: beforeError } = await supabase
		.from('company_member_addresses')
		.select('*')
		.eq('id', addressId)
		.is('deleted_at', null)
		.maybeSingle<CompanyMemberAddressRow>();

	if (beforeError) throw beforeError;
	if (!before) return null;

	const { data: after, error } = await supabase
		.from('company_member_addresses')
		.update({
			deleted_at: new Date().toISOString(),
			deleted_by: actorUserId,
			delete_reason: reason,
			updated_at: new Date().toISOString(),
			updated_by: actorUserId,
		})
		.eq('id', addressId)
		.select('*')
		.single<CompanyMemberAddressRow>();

	if (error) throw error;

	await recordAuditEvent({
		entityType: 'company_member_address',
		entityId: String(addressId),
		parentType: 'company_member',
		parentId: String(before.company_member_id),
		action: 'soft_delete',
		changedBy: actorUserId,
		beforeData: before,
		afterData: after,
	});

	return after;
}
