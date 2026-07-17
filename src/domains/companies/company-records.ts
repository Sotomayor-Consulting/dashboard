import type { CompanyLegalStatus, CompanyManagementType, CompanyUpdate } from '@domains/companies/types/company';

import type { SupabaseClient } from '@supabase/supabase-js';
import { recordAuditEvent } from '@domains/audit/audit-events';


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

const cleanBoolean = (value: unknown) => {
	if (typeof value === 'boolean') return value;
	if (typeof value !== 'string') return null;
	const normalized = value.trim().toLowerCase();
	if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
	if (['false', '0', 'no', 'off'].includes(normalized)) return false;
	return null;
};

export const normalizeManagementType = (value: string | null): CompanyManagementType => {
	const normalized = (value ?? '').toLowerCase();
	if (normalized.includes('manager')) return 'manager-managed';
	return 'member-managed';
};

const hasOwn = (input: object, field: string) =>
	Object.prototype.hasOwnProperty.call(input, field);

export async function getCompanyIdForIncorporation(
	supabase: SupabaseClient,
	incorporationId: string,
): Promise<string | null> {
	const { data, error } = await supabase
		.from('companies')
		.select('id')
		.eq('incorporation_id', incorporationId)
		.maybeSingle<{ id: string | null }>();

	if (error) throw error;
	return data?.id ?? null;
}

export async function createCompanyFromIncorporation(
	supabase: SupabaseClient,
	incorporationId: string,
	actorUserId: string,
	status: CompanyLegalStatus = 'draft',
): Promise<string> {
	const existingCompanyId = await getCompanyIdForIncorporation(supabase, incorporationId);
	if (existingCompanyId) return existingCompanyId;

	const { data: incorporation, error: incorporationError } = await supabase
		.from('incorporations')
		.select(
			`id, user_id, principal_name, entity_type, formation_state_id`,
		)
		.eq('id', incorporationId)
		.maybeSingle<{
			id: string;
			user_id: string;
			principal_name: string | null;
			entity_type: string | null;
			formation_state_id: number | null;
		}>();

	if (incorporationError) throw incorporationError;
	if (!incorporation) {
		throw new Error('INCORPORATION_NOT_FOUND');
	}

	const now = new Date().toISOString();
	const { data: company, error: companyError } = await supabase
		.from('companies')
		.insert({
			user_id: incorporation.user_id,
			incorporation_id: incorporationId,
			legal_name: incorporation.principal_name,
			entity_type: incorporation.entity_type ?? 'llc',
			formation_state_id: incorporation.formation_state_id,
			legal_status: status,
			created_by: actorUserId,
			updated_by: actorUserId,
			created_at: now,
			updated_at: now,
		})
		.select('id')
		.single<{ id: string }>();

	if (companyError) throw companyError;

	await recordAuditEvent({
		entityType: 'company',
		entityId: company.id,
		parentType: 'incorporation',
		parentId: incorporationId,
		action: 'create',
		changedBy: actorUserId,
		afterData: {
			id: company.id,
			incorporation_id: incorporationId,
			legal_status: status,
			legal_name: incorporation.principal_name,
		},
	});

	return company.id;
}

export async function updateCompanyForIncorporation(
	supabase: SupabaseClient,
	incorporationId: string,
	input: CompanyUpdate,
	actorUserId: string,
) {
	const companyId = await getCompanyIdForIncorporation(supabase, incorporationId);
	if (!companyId) throw new Error('COMPANY_NOT_CREATED');

	const { data: before, error: beforeError } = await supabase
		.from('companies')
		.select('*')
		.eq('id', companyId)
		.maybeSingle();

	if (beforeError) throw beforeError;
	if (!before) throw new Error('COMPANY_NOT_FOUND');

	const payload = companyUpdatePayload(input);
	if (!Object.keys(payload).length) throw new Error('NO_COMPANY_FIELDS_TO_UPDATE');

	const { data: company, error } = await supabase
		.from('companies')
		.update({
			...payload,
			updated_at: new Date().toISOString(),
			updated_by: actorUserId,
		})
		.eq('id', companyId)
		.select('*')
		.single();

	if (error) throw error;

	await recordAuditEvent({
		entityType: 'company',
		entityId: companyId,
		parentType: 'incorporation',
		parentId: incorporationId,
		action: 'update',
		changedBy: actorUserId,
		beforeData: before,
		afterData: company,
	});

	return company;
}

function companyUpdatePayload(input: CompanyUpdate) {
	const payload: Record<string, unknown> = {};

	const textFields = [
		'legal_name',
		'identification_number',
		'entity_type',
		'tax_classification',
		'management_type',
		'activity_description',
		'incorporation_date',
		'irs_email',
		'legal_status',
	] as const;

	for (const field of textFields) {
		if (hasOwn(input, field)) payload[field] = cleanText(input[field]);
	}

	const numberFields = [
		'formation_state_id',
		'formation_country_id',
		'activity_code_id',
	] as const;

	for (const field of numberFields) {
		if (hasOwn(input, field)) payload[field] = cleanNumber(input[field]);
	}

	const booleanFields = ['us_source_income', 'joint_ownership'] as const;
	for (const field of booleanFields) {
		if (hasOwn(input, field)) payload[field] = cleanBoolean(input[field]);
	}

	return payload;
}
