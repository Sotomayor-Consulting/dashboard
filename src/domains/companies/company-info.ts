import type { SupabaseClient } from '@supabase/supabase-js';
import { recordAuditEvent } from '@domains/audit/audit-events';
import { US_COUNTRY_ID } from '@domains/locations/constants';
import { assertManagementTypeChange } from './rules/management-type.rules';

export type ManagementType = 'member-managed' | 'manager-managed';
export type TaxClassification = 'disregarded_entity' | 'corporation';
export type CompanyEntityType = 'llc' | 'lp' | 'c-corp';

export interface CompanyInfoInput {
	legal_name?: string | null;
	filing_number?: string | null;
	identification_number?: string | null;
	entity_type?: CompanyEntityType;
	formation_country_id?: number | null;
	formation_state_id?: number | null;
	management_type?: ManagementType;
	tax_clasification?: TaxClassification | null;
	activity_code_id?: number | null;
	us_source_income?: boolean | null;
	activity_description?: string | null;
}

export interface CompanyInfoRow {
	id: string;
	legal_name: string | null;
	filing_number: string | null;
	identification_number: string | null;
	entity_type: CompanyEntityType;
	formation_country_id: number | null;
	formation_state_id: number | null;
	management_type: ManagementType;
	tax_clasification: TaxClassification | null;
	activity_code_id: number | null;
	us_source_income: boolean | null;
	activity_description: string | null;
}

const COLUMNS =
	'id, legal_name, filing_number, identification_number, entity_type, formation_country_id, formation_state_id, management_type, tax_clasification, activity_code_id, us_source_income, activity_description';

const cleanText = (value: unknown) => {
	if (typeof value !== 'string') return null;
	const trimmed = value.trim();
	return trimmed ? trimmed : null;
};

const buildPayload = (input: CompanyInfoInput) => ({
	legal_name: cleanText(input.legal_name),
	filing_number: cleanText(input.filing_number),
	identification_number: cleanText(input.identification_number),
	entity_type: input.entity_type,
	// Para LLCs siempre incorporamos en US. El form ni siquiera expone este
	// campo — lo fija el dominio para garantizar consistencia.
	formation_country_id: input.formation_country_id ?? US_COUNTRY_ID,
	formation_state_id: input.formation_state_id ?? null,
	management_type: input.management_type,
	tax_clasification: input.tax_clasification ?? null,
	activity_code_id: input.activity_code_id ?? null,
	us_source_income: input.us_source_income ?? null,
	activity_description: cleanText(input.activity_description),
});

export async function getCompanyInfo(
	supabase: SupabaseClient,
	companyId: string,
): Promise<CompanyInfoRow | null> {
	const { data, error } = await supabase
		.from('companies')
		.select(COLUMNS)
		.eq('id', companyId)
		.maybeSingle<CompanyInfoRow>();
	if (error) throw error;
	return data ?? null;
}

export async function updateCompanyInfo(
	supabase: SupabaseClient,
	companyId: string,
	input: CompanyInfoInput,
	actorUserId: string,
): Promise<CompanyInfoRow> {
	const before = await getCompanyInfo(supabase, companyId);
	if (!before) throw new Error('COMPANY_NOT_FOUND');

	// Si el management_type cambia, validar contra los company_members
	if (
		input.management_type &&
		input.management_type !== before.management_type
	) {
		await assertManagementTypeChange(
			supabase,
			companyId,
			input.management_type,
		);
	}

	const payload = buildPayload(input);
	const { data, error } = await supabase
		.from('companies')
		.update({
			...payload,
			updated_at: new Date().toISOString(),
			updated_by: actorUserId,
		})
		.eq('id', companyId)
		.select(COLUMNS)
		.single<CompanyInfoRow>();
	if (error) throw error;

	await recordAuditEvent({
		entityType: 'company',
		entityId: companyId,
		action: 'update',
		changedBy: actorUserId,
		beforeData: before,
		afterData: data,
	});

	return data;
}
