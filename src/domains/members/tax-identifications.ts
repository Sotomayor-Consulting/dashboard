import type { SupabaseClient } from '@supabase/supabase-js';
import { recordAuditEvent } from '@domains/audit/audit-events';

export type MemberTaxIdentificationType = 'ssn' | 'itin' | 'ein' | 'foreign';

export interface MemberTaxIdentificationRow {
	id: number;
	member_id: string;
	type: MemberTaxIdentificationType;
	number: string;
	country_id: number | null;
	is_active: boolean;
	is_primary: boolean | null;
	created_at: string;
	updated_at: string | null;
}

export interface MemberTaxIdentificationInput {
	type?: MemberTaxIdentificationType | null | undefined;
	number?: string | null | undefined;
	country_id?: number | null | undefined;
	is_primary?: boolean | null | undefined;
}

const cleanText = (value: unknown) => {
	if (typeof value !== 'string') return null;
	const trimmed = value.trim();
	return trimmed ? trimmed : null;
};

export async function listMemberTaxIdentifications(
	supabase: SupabaseClient,
	memberId: string,
	options: { includeInactive?: boolean } = {},
): Promise<MemberTaxIdentificationRow[]> {
	let query = supabase
		.from('member_tax_identifications')
		.select('*')
		.eq('member_id', memberId)
		.order('is_primary', { ascending: false, nullsFirst: false })
		.order('type', { ascending: true });
	if (!options.includeInactive) query = query.eq('is_active', true);

	const { data, error } = await query;
	if (error) throw error;
	return (data ?? []) as MemberTaxIdentificationRow[];
}

/**
 * Crea o reemplaza la identificación de ese tipo (unique member_id+type en DB).
 * Si se marca is_primary, desmarca la primary anterior del member.
 */
export async function upsertMemberTaxIdentification(
	supabase: SupabaseClient,
	memberId: string,
	input: MemberTaxIdentificationInput,
	actorUserId: string,
): Promise<MemberTaxIdentificationRow> {
	const type = input.type ?? null;
	const number = cleanText(input.number);
	if (!type) throw new Error('TAX_ID_TYPE_REQUIRED');
	if (!number) throw new Error('TAX_ID_NUMBER_REQUIRED');
	if (type === 'foreign' && !input.country_id) {
		throw new Error('TAX_ID_COUNTRY_REQUIRED');
	}

	if (input.is_primary) {
		const { error: unsetError } = await supabase
			.from('member_tax_identifications')
			.update({ is_primary: false, updated_at: new Date().toISOString() })
			.eq('member_id', memberId)
			.eq('is_primary', true);
		if (unsetError) throw unsetError;
	}

	const { data, error } = await supabase
		.from('member_tax_identifications')
		.upsert(
			{
				member_id: memberId,
				type,
				number,
				country_id: type === 'foreign' ? (input.country_id ?? null) : null,
				is_primary: input.is_primary ?? false,
				is_active: true,
				updated_at: new Date().toISOString(),
			},
			{ onConflict: 'member_id,type' },
		)
		.select('*')
		.single<MemberTaxIdentificationRow>();
	if (error) throw error;

	await recordAuditEvent({
		entityType: 'member_tax_identification',
		entityId: String(data.id),
		parentType: 'member',
		parentId: memberId,
		action: 'update',
		changedBy: actorUserId,
		afterData: data,
	});
	return data;
}

/** Archiva (is_active=false) — el dato fiscal histórico no se borra. */
export async function archiveMemberTaxIdentification(
	supabase: SupabaseClient,
	memberId: string,
	taxIdentificationId: number,
	actorUserId: string,
): Promise<MemberTaxIdentificationRow> {
	const { data: before, error: beforeError } = await supabase
		.from('member_tax_identifications')
		.select('*')
		.eq('id', taxIdentificationId)
		.eq('member_id', memberId)
		.maybeSingle<MemberTaxIdentificationRow>();
	if (beforeError) throw beforeError;
	if (!before) throw new Error('TAX_ID_NOT_FOUND');

	const { data, error } = await supabase
		.from('member_tax_identifications')
		.update({
			is_active: false,
			is_primary: false,
			updated_at: new Date().toISOString(),
		})
		.eq('id', taxIdentificationId)
		.eq('member_id', memberId)
		.select('*')
		.single<MemberTaxIdentificationRow>();
	if (error) throw error;

	await recordAuditEvent({
		entityType: 'member_tax_identification',
		entityId: String(data.id),
		parentType: 'member',
		parentId: memberId,
		action: 'soft_delete',
		changedBy: actorUserId,
		beforeData: before,
		afterData: data,
	});
	return data;
}
