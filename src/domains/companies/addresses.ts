import type { SupabaseClient } from '@supabase/supabase-js';
import { recordAuditEvent } from '@domains/audit/audit-events';

export interface CompanyAddressInput {
	type?: string | null;
	line1?: string | null;
	line2?: string | null;
	city?: string | null;
	county?: string | null;
	zip?: string | null;
	country?: string | null;
	country_id?: number | null;
	state_id?: number | null;
}

export interface CompanyAddressRow {
	id: number;
	incorporation_id: string;
	type: string;
	line1: string;
	line2: string | null;
	city: string;
	county: string | null;
	zip: string | null;
	country_id: number;
	state_id: number | null;
	created_at: string;
	updated_at: string | null;
	updated_by: string | null;
	deleted_at: string | null;
	deleted_by: string | null;
	delete_reason: string | null;
	country?: string | null;
	state?: string | null;
}

const cleanText = (value: unknown) => {
	if (typeof value !== 'string') return null;
	const trimmed = value.trim();
	return trimmed ? trimmed : null;
};

const cleanNumber = (value: unknown) => {
	if (typeof value === 'number' && Number.isInteger(value)) return value;
	if (typeof value !== 'string' || value.trim() === '') return null;
	const parsed = Number(value);
	return Number.isInteger(parsed) ? parsed : null;
};

const isMissingColumnError = (error: unknown, column: string) => {
	const err = error as { code?: string; message?: string } | null;
	return (
		err?.code === '42703' &&
		typeof err.message === 'string' &&
		err.message.includes(column)
	);
};

async function resolveCountryId(
	supabase: SupabaseClient,
	input: CompanyAddressInput,
) {
	const explicit = cleanNumber(input.country_id);
	if (explicit) return explicit;

	const country = cleanText(input.country);
	const query = supabase.from('countries').select('id').limit(1);
	const { data, error } = country
		? await query.or(`name.ilike.%${country}%,iso.eq.${country.toUpperCase()}`)
		: await query.eq('iso', 'US');

	if (error) throw error;
	const id = data?.[0]?.id;
	if (!id) throw new Error('COUNTRY_NOT_FOUND');
	return id as number;
}

async function addressPayload(
	supabase: SupabaseClient,
	input: CompanyAddressInput,
	actorUserId?: string,
) {
	const countryId = await resolveCountryId(supabase, input);
	const line1 = cleanText(input.line1);
	const city = cleanText(input.city);

	if (!line1) throw new Error('ADDRESS_LINE1_REQUIRED');
	if (!city) throw new Error('ADDRESS_CITY_REQUIRED');

	const payload: Record<string, unknown> = {
		type: cleanText(input.type) ?? 'operational',
		line1,
		line2: cleanText(input.line2),
		city,
		county: cleanText(input.county),
		zip: cleanText(input.zip),
		country_id: countryId,
		state_id: cleanNumber(input.state_id),
	};

	if (actorUserId) {
		payload.updated_at = new Date().toISOString();
		payload.updated_by = actorUserId;
	}

	return payload;
}

function mapAddress(row: any): CompanyAddressRow {
	const countryRelation = row.country;
	const stateRelation = row.state_ref;
	return {
		...row,
		updated_at: row.updated_at ?? null,
		updated_by: row.updated_by ?? null,
		deleted_at: row.deleted_at ?? null,
		deleted_by: row.deleted_by ?? null,
		delete_reason: row.delete_reason ?? null,
		country: Array.isArray(countryRelation)
			? (countryRelation[0]?.name ?? null)
			: (countryRelation?.name ?? null),
		state: Array.isArray(stateRelation)
			? (stateRelation[0]?.name ?? null)
			: (stateRelation?.name ?? null),
	};
}

export async function listCompanyAddresses(
	supabase: SupabaseClient,
	incorporationId: string,
): Promise<CompanyAddressRow[]> {
	const select = `*,
		country:country_id ( id, name, iso ),
		state_ref:state_id ( id, name, code )`;

	const query = supabase
		.from('company_addresses')
		.select(select)
		.eq('incorporation_id', incorporationId)
		.order('created_at', { ascending: true });

	const { data, error } = await query.is('deleted_at', null);
	if (isMissingColumnError(error, 'deleted_at')) {
		const fallback = await supabase
			.from('company_addresses')
			.select(select)
			.eq('incorporation_id', incorporationId)
			.order('created_at', { ascending: true });

		if (fallback.error) throw fallback.error;
		return (fallback.data ?? []).map(mapAddress);
	}

	if (error) throw error;
	return (data ?? []).map(mapAddress);
}

export async function createCompanyAddress(
	supabase: SupabaseClient,
	incorporationId: string,
	input: CompanyAddressInput,
	actorUserId: string,
) {
	const payload = await addressPayload(supabase, input);
	const { data, error } = await supabase
		.from('company_addresses')
		.insert({
			...payload,
			incorporation_id: incorporationId,
		})
		.select(
			`*,
			country:country_id ( id, name, iso ),
			state_ref:state_id ( id, name, code )`,
		)
		.single();

	if (error) throw error;
	const address = mapAddress(data);

	await recordAuditEvent(supabase, {
		entityType: 'company_address',
		entityId: String(address.id),
		parentType: 'incorporation',
		parentId: incorporationId,
		action: 'create',
		changedBy: actorUserId,
		afterData: address,
	});

	return address;
}

export async function updateCompanyAddress(
	supabase: SupabaseClient,
	incorporationId: string,
	addressId: number,
	input: CompanyAddressInput,
	actorUserId: string,
) {
	const before = await getActiveCompanyAddress(
		supabase,
		incorporationId,
		addressId,
	);
	if (!before) throw new Error('COMPANY_ADDRESS_NOT_FOUND');

	const payload = await addressPayload(supabase, input, actorUserId);
	const query = supabase
		.from('company_addresses')
		.update(payload)
		.eq('id', addressId)
		.eq('incorporation_id', incorporationId);

	const { data, error } = await query
		.is('deleted_at', null)
		.select(
			`*,
			country:country_id ( id, name, iso ),
			state_ref:state_id ( id, name, code )`,
		)
		.single();

	if (isMissingColumnError(error, 'deleted_at')) {
		const fallback = await supabase
			.from('company_addresses')
			.update(await addressPayload(supabase, input))
			.eq('id', addressId)
			.eq('incorporation_id', incorporationId)
			.select(
				`*,
				country:country_id ( id, name, iso ),
				state_ref:state_id ( id, name, code )`,
			)
			.single();

		if (fallback.error) throw fallback.error;
		const address = mapAddress(fallback.data);

		await recordAuditEvent(supabase, {
			entityType: 'company_address',
			entityId: String(address.id),
			parentType: 'incorporation',
			parentId: incorporationId,
			action: 'update',
			changedBy: actorUserId,
			beforeData: before,
			afterData: address,
		});

		return address;
	}

	if (error) throw error;
	const address = mapAddress(data);

	await recordAuditEvent(supabase, {
		entityType: 'company_address',
		entityId: String(address.id),
		parentType: 'incorporation',
		parentId: incorporationId,
		action: 'update',
		changedBy: actorUserId,
		beforeData: before,
		afterData: address,
	});

	return address;
}

export async function softDeleteCompanyAddress(
	supabase: SupabaseClient,
	incorporationId: string,
	addressId: number,
	actorUserId: string,
	reason: string | null,
) {
	const before = await getActiveCompanyAddress(
		supabase,
		incorporationId,
		addressId,
	);
	if (!before) throw new Error('COMPANY_ADDRESS_NOT_FOUND');

	const deletedAt = new Date().toISOString();
	const { data, error } = await supabase
		.from('company_addresses')
		.update({
			deleted_at: deletedAt,
			deleted_by: actorUserId,
			delete_reason: cleanText(reason) ?? 'Deleted from company details',
			updated_at: deletedAt,
			updated_by: actorUserId,
		})
		.eq('id', addressId)
		.eq('incorporation_id', incorporationId)
		.is('deleted_at', null)
		.select('*')
		.single<CompanyAddressRow>();

	if (error) throw error;

	await recordAuditEvent(supabase, {
		entityType: 'company_address',
		entityId: String(addressId),
		parentType: 'incorporation',
		parentId: incorporationId,
		action: 'soft_delete',
		changedBy: actorUserId,
		beforeData: before,
		afterData: data,
	});

	return data;
}

async function getActiveCompanyAddress(
	supabase: SupabaseClient,
	incorporationId: string,
	addressId: number,
) {
	const select = `*,
		country:country_id ( id, name, iso ),
		state_ref:state_id ( id, name, code )`;

	const query = supabase
		.from('company_addresses')
		.select(select)
		.eq('id', addressId)
		.eq('incorporation_id', incorporationId);

	const { data, error } = await query.is('deleted_at', null).maybeSingle();
	if (isMissingColumnError(error, 'deleted_at')) {
		const fallback = await supabase
			.from('company_addresses')
			.select(select)
			.eq('id', addressId)
			.eq('incorporation_id', incorporationId)
			.maybeSingle();

		if (fallback.error) throw fallback.error;
		return fallback.data ? mapAddress(fallback.data) : null;
	}

	if (error) throw error;
	return data ? mapAddress(data) : null;
}
