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
	company_id: string | null;
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

const cleanText = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null);

const cleanNumber = (v: unknown) =>
	typeof v === 'number' && Number.isInteger(v) ? v : typeof v === 'string' && v.trim() && Number.isInteger(Number(v)) ? Number(v) : null;

const isMissingCompanyIdColumn = (e: any) => e?.code === '42703' && e?.message?.includes('company_id');

async function resolveCountryId(supabase: SupabaseClient, input: CompanyAddressInput) {
	const explicit = cleanNumber(input.country_id);
	if (explicit) return explicit as number;

	const country = cleanText(input.country);
	const q = supabase.from('countries').select('id').limit(1);
	const { data, error } = country ? await q.or(`name.ilike.%${country}%,iso.eq.${country.toUpperCase()}`) : await q.eq('iso', 'US');

	if (error) throw error;
	if (!data?.[0]?.id) throw new Error('COUNTRY_NOT_FOUND');
	return data[0].id as number;
}

async function addressPayload(supabase: SupabaseClient, input: CompanyAddressInput, actorUserId?: string) {
	const line1 = cleanText(input.line1), city = cleanText(input.city);
	if (!line1) throw new Error('ADDRESS_LINE1_REQUIRED');
	if (!city) throw new Error('ADDRESS_CITY_REQUIRED');

	const payload: Record<string, unknown> = {
		type: cleanText(input.type) ?? 'operational',
		line1,
		line2: cleanText(input.line2),
		city,
		county: cleanText(input.county),
		zip: cleanText(input.zip),
		country_id: await resolveCountryId(supabase, input),
		state_id: cleanNumber(input.state_id),
	};

	if (actorUserId) Object.assign(payload, { updated_at: new Date().toISOString(), updated_by: actorUserId });
	return payload;
}

const mapAddress = (r: any): CompanyAddressRow => ({
	...r,
	updated_at: r.updated_at ?? null,
	updated_by: r.updated_by ?? null,
	deleted_at: r.deleted_at ?? null,
	deleted_by: r.deleted_by ?? null,
	delete_reason: r.delete_reason ?? null,
	country: Array.isArray(r.country) ? r.country[0]?.name ?? null : r.country?.name ?? null,
	state: Array.isArray(r.state_ref) ? r.state_ref[0]?.name ?? null : r.state_ref?.name ?? null,
});

const SEL = `*, country:country_id ( id, name, iso ), state_ref:state_id ( id, name, code )`;

export async function listCompanyAddresses(supabase: SupabaseClient, companyId?: string | null): Promise<CompanyAddressRow[]> {
	if (!companyId) return [];

	const { data, error } = await supabase.from('company_addresses').select(SEL).eq('company_id', companyId).is('deleted_at', null).order('created_at', { ascending: true });

	if (error) {
		if (isMissingCompanyIdColumn(error)) return [];
		throw error;
	}
	return (data ?? []).map(mapAddress);
}

export async function createCompanyAddress(supabase: SupabaseClient, companyId: string, input: CompanyAddressInput, actorUserId: string) {
	const { data, error } = await supabase.from('company_addresses').insert({ ...(await addressPayload(supabase, input)), company_id: companyId }).select(SEL).single();
	if (error) throw error;

	const address = mapAddress(data);
	await recordAuditEvent({ entityType: 'company_address', entityId: String(address.id), parentType: 'company', parentId: companyId, action: 'create', changedBy: actorUserId, afterData: address });
	return address;
}

export async function updateCompanyAddress(supabase: SupabaseClient, companyId: string, addressId: number, input: CompanyAddressInput, actorUserId: string) {
	const before = await getActiveCompanyAddress(supabase, companyId, addressId);
	if (!before) throw new Error('COMPANY_ADDRESS_NOT_FOUND');

	const { data, error } = await supabase.from('company_addresses').update(await addressPayload(supabase, input, actorUserId)).eq('id', addressId).eq('company_id', companyId).is('deleted_at', null).select(SEL).single();
	if (error) throw error;

	const address = mapAddress(data);
	await recordAuditEvent({ entityType: 'company_address', entityId: String(address.id), parentType: 'company', parentId: companyId, action: 'update', changedBy: actorUserId, beforeData: before, afterData: address });
	return address;
}

export async function softDeleteCompanyAddress(supabase: SupabaseClient, companyId: string, addressId: number, actorUserId: string, reason: string | null) {
	const before = await getActiveCompanyAddress(supabase, companyId, addressId);
	if (!before) throw new Error('COMPANY_ADDRESS_NOT_FOUND');

	const deletedAt = new Date().toISOString();
	const { error } = await supabase
		.from('company_addresses')
		.update({
			deleted_at: deletedAt,
			deleted_by: actorUserId,
			delete_reason: cleanText(reason) ?? 'Deleted from company details',
			updated_at: deletedAt,
			updated_by: actorUserId,
		})
		.eq('id', addressId)
		.eq('company_id', companyId)
		.is('deleted_at', null);
	if (error) throw error;

	const afterData: Partial<CompanyAddressRow> = {
		id: addressId,
		company_id: companyId,
		deleted_at: deletedAt,
		deleted_by: actorUserId,
		delete_reason: cleanText(reason) ?? 'Deleted from company details',
		updated_at: deletedAt,
		updated_by: actorUserId,
	};

	await recordAuditEvent({
		entityType: 'company_address',
		entityId: String(addressId),
		parentType: 'company',
		parentId: companyId,
		action: 'soft_delete',
		changedBy: actorUserId,
		beforeData: before,
		afterData,
	});

	return afterData;
}

async function getActiveCompanyAddress(supabase: SupabaseClient, companyId: string, addressId: number) {
	const { data, error } = await supabase.from('company_addresses').select(SEL).eq('id', addressId).eq('company_id', companyId).is('deleted_at', null).maybeSingle();
	if (error) throw error;
	return data ? mapAddress(data) : null;
}
