import type { SupabaseClient } from '@supabase/supabase-js';
import { recordAuditEvent } from '@domains/audit/audit-events';

export type InternalAddressType =
	'mailing' | 'ein_request' | 'virtual_address' | 'other';

export interface InternalAddressRow {
	id: number;
	type: InternalAddressType;
	country_id: number;
	state_id: number | null;
	city: string;
	county: string | null;
	line1: string;
	line2: string | null;
	zip: string;
	service_plan_id: number | null;
	is_active: boolean;
	created_at: string;
	updated_at: string | null;
	country_name?: string | null;
	state_name?: string | null;
}

export interface InternalAddressInput {
	type?: InternalAddressType | null | undefined;
	country_id?: number | null | undefined;
	state_id?: number | null | undefined;
	city?: string | null | undefined;
	county?: string | null | undefined;
	line1?: string | null | undefined;
	line2?: string | null | undefined;
	zip?: string | null | undefined;
	service_plan_id?: number | null | undefined;
	is_active?: boolean | undefined;
}

const cleanText = (value: unknown) => {
	if (typeof value !== 'string') return null;
	const trimmed = value.trim();
	return trimmed ? trimmed : null;
};

/** Lookup de país/estado en public (embeds cross-schema no resuelven desde catalogs). */
async function attachGeoNames(
	supabase: SupabaseClient,
	rows: InternalAddressRow[],
): Promise<InternalAddressRow[]> {
	if (!rows.length) return rows;
	const countryIds = [...new Set(rows.map((r) => r.country_id))];
	const stateIds = [
		...new Set(rows.map((r) => r.state_id).filter(Boolean)),
	] as number[];

	const [countries, states] = await Promise.all([
		supabase.from('countries').select('id, name').in('id', countryIds),
		stateIds.length
			? supabase.from('states').select('id, name').in('id', stateIds)
			: Promise.resolve({ data: [], error: null }),
	]);
	if (countries.error) throw countries.error;
	if (states.error) throw states.error;

	const countryNames = new Map(
		(countries.data ?? []).map((c) => [c.id as number, c.name as string]),
	);
	const stateNames = new Map(
		(states.data ?? []).map((s) => [s.id as number, s.name as string]),
	);

	return rows.map((r) => ({
		...r,
		country_name: countryNames.get(r.country_id) ?? null,
		state_name: r.state_id ? (stateNames.get(r.state_id) ?? null) : null,
	}));
}

export async function listInternalAddresses(
	supabase: SupabaseClient,
	options: {
		type?: InternalAddressType | null;
		includeInactive?: boolean;
	} = {},
): Promise<InternalAddressRow[]> {
	let query = supabase
		.schema('catalogs')
		.from('internal_addresses')
		.select('*')
		.order('created_at', { ascending: true });
	if (!options.includeInactive) query = query.eq('is_active', true);
	if (options.type) query = query.eq('type', options.type);

	const { data, error } = await query;
	if (error) throw error;
	return attachGeoNames(supabase, (data ?? []) as InternalAddressRow[]);
}

export async function getInternalAddressById(
	supabase: SupabaseClient,
	addressId: number,
): Promise<InternalAddressRow | null> {
	const { data, error } = await supabase
		.schema('catalogs')
		.from('internal_addresses')
		.select('*')
		.eq('id', addressId)
		.maybeSingle<InternalAddressRow>();
	if (error) throw error;
	if (!data) return null;

	const [resolved] = await attachGeoNames(supabase, [data]);
	return resolved ?? null;
}

export async function createInternalAddress(
	supabase: SupabaseClient,
	input: InternalAddressInput,
	actorUserId: string,
): Promise<InternalAddressRow> {
	const city = cleanText(input.city);
	const line1 = cleanText(input.line1);
	const zip = cleanText(input.zip);
	if (!input.country_id) throw new Error('COUNTRY_REQUIRED');
	if (!city) throw new Error('CITY_REQUIRED');
	if (!line1) throw new Error('LINE1_REQUIRED');
	if (!zip) throw new Error('ZIP_REQUIRED');

	const { data, error } = await supabase
		.schema('catalogs')
		.from('internal_addresses')
		.insert({
			type: input.type ?? 'mailing',
			country_id: input.country_id,
			state_id: input.state_id ?? null,
			city,
			county: cleanText(input.county),
			line1,
			line2: cleanText(input.line2),
			zip,
			service_plan_id: input.service_plan_id ?? null,
		})
		.select('*')
		.single<InternalAddressRow>();
	if (error) throw error;

	await recordAuditEvent({
		entityType: 'internal_address',
		entityId: String(data.id),
		action: 'create',
		changedBy: actorUserId,
		afterData: data,
	});

	const [resolved] = await attachGeoNames(supabase, [data]);
	return resolved ?? data;
}

export async function updateInternalAddress(
	supabase: SupabaseClient,
	addressId: number,
	input: InternalAddressInput,
	actorUserId: string,
): Promise<InternalAddressRow> {
	const before = await getInternalAddressById(supabase, addressId);
	if (!before) throw new Error('INTERNAL_ADDRESS_NOT_FOUND');

	const payload: Record<string, unknown> = {
		updated_at: new Date().toISOString(),
	};
	if (input.type !== undefined && input.type !== null)
		payload.type = input.type;
	if (input.country_id !== undefined && input.country_id !== null)
		payload.country_id = input.country_id;
	if (input.state_id !== undefined) payload.state_id = input.state_id;
	if (input.city !== undefined) payload.city = cleanText(input.city);
	if (input.county !== undefined) payload.county = cleanText(input.county);
	if (input.line1 !== undefined) payload.line1 = cleanText(input.line1);
	if (input.line2 !== undefined) payload.line2 = cleanText(input.line2);
	if (input.zip !== undefined) payload.zip = cleanText(input.zip);
	if (input.service_plan_id !== undefined)
		payload.service_plan_id = input.service_plan_id;
	if (input.is_active !== undefined) payload.is_active = input.is_active;

	const { data, error } = await supabase
		.schema('catalogs')
		.from('internal_addresses')
		.update(payload)
		.eq('id', addressId)
		.select('*')
		.single<InternalAddressRow>();
	if (error) throw error;

	await recordAuditEvent({
		entityType: 'internal_address',
		entityId: String(data.id),
		action: 'update',
		changedBy: actorUserId,
		beforeData: before,
		afterData: data,
	});

	const [resolved] = await attachGeoNames(supabase, [data]);
	return resolved ?? data;
}

/** Archivar (is_active=false). El hard delete queda protegido por FKs (ON DELETE RESTRICT en consumidores). */
export async function archiveInternalAddress(
	supabase: SupabaseClient,
	addressId: number,
	actorUserId: string,
): Promise<InternalAddressRow> {
	return updateInternalAddress(
		supabase,
		addressId,
		{ is_active: false },
		actorUserId,
	);
}
