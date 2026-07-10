import type { SupabaseClient } from '@supabase/supabase-js';
import { recordAuditEvent } from '@domains/audit/audit-events';

import { COMPANY_ADDRESS_COLUMNS, type CompanyAddressRow, type CompanyAddressInput } from '@domains/companies/types/company-address';


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

async function addressPayload(supabase: SupabaseClient, input: CompanyAddressInput) {
	const line1 = cleanText(input.line1), city = cleanText(input.city);
	if (!line1) throw new Error('ADDRESS_LINE1_REQUIRED');
	if (!city) throw new Error('ADDRESS_CITY_REQUIRED');

	return {
		type: cleanText(input.type) ?? 'operational',
		line1,
		line2: cleanText(input.line2),
		city,
		county: cleanText(input.county),
		zip: cleanText(input.zip),
		country_id: await resolveCountryId(supabase, input),
		state_id: cleanNumber(input.state_id),
	};
}

type CompanyAddressRaw = Record<string, unknown> & {
	country?: { name: string } | { name: string }[] | null;
	state_ref?: { name: string } | { name: string }[] | null;
};

const mapAddress = (r: CompanyAddressRaw): CompanyAddressRow => ({
	...r as unknown as CompanyAddressRow,
	updated_at: (r.updated_at as string | null) ?? null,
	country: Array.isArray(r.country) ? r.country[0]?.name ?? null : r.country?.name ?? null,
	state: Array.isArray(r.state_ref) ? r.state_ref[0]?.name ?? null : r.state_ref?.name ?? null,
});

const SEL = COMPANY_ADDRESS_COLUMNS.WITH_RELATIONS;

export async function listCompanyAddresses(supabase: SupabaseClient, companyId?: string | null): Promise<CompanyAddressRow[]> {
	if (!companyId) return [];

	const { data, error } = await supabase.from('company_addresses').select(SEL).eq('company_id', companyId).order('created_at', { ascending: true });

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
	const before = await getCompanyAddress(supabase, companyId, addressId);
	if (!before) throw new Error('COMPANY_ADDRESS_NOT_FOUND');

	const { data, error } = await supabase.from('company_addresses').update({ ...(await addressPayload(supabase, input)), updated_at: new Date().toISOString() }).eq('id', addressId).eq('company_id', companyId).select(SEL).single();
	if (error) throw error;

	const address = mapAddress(data);
	await recordAuditEvent({ entityType: 'company_address', entityId: String(address.id), parentType: 'company', parentId: companyId, action: 'update', changedBy: actorUserId, beforeData: before, afterData: address });
	return address;
}

export async function deleteCompanyAddress(supabase: SupabaseClient, companyId: string, addressId: number, actorUserId: string) {
	const before = await getCompanyAddress(supabase, companyId, addressId);
	if (!before) throw new Error('COMPANY_ADDRESS_NOT_FOUND');

	const { error } = await supabase
		.from('company_addresses')
		.delete()
		.eq('id', addressId)
		.eq('company_id', companyId);
	if (error) throw error;

	await recordAuditEvent({
		entityType: 'company_address',
		entityId: String(addressId),
		parentType: 'company',
		parentId: companyId,
		action: 'soft_delete',
		changedBy: actorUserId,
		beforeData: before,
	});
}

async function getCompanyAddress(supabase: SupabaseClient, companyId: string, addressId: number): Promise<CompanyAddressRow | null> {
	const { data, error } = await supabase.from('company_addresses').select(SEL).eq('id', addressId).eq('company_id', companyId).maybeSingle();
	if (error) throw error;
	return data ? mapAddress(data as CompanyAddressRaw) : null;
}
