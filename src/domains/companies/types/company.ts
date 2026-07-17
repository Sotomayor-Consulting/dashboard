export type CompanyEntityType = 'llc' | 'lp' | 'c-corp';
export type CompanyManagementType = 'member-managed' | 'manager-managed';
export type CompanyLegalStatus =
	| 'draft'
	| 'pending_validation'
	| 'pending'
	| 'active'
	| 'inactive'
	| 'suspended'
	| 'dissolved';
export type CompanyTaxClassification = 'disregarded_entity' | 'corporation';

export const COMPANY_COLUMNS = {
	BASE: 'id, legal_name, entity_type, management_type, legal_status, tax_classification, identification_number, filing_number, activity_description, us_source_income, joint_ownership, incorporation_date, irs_email, activity_code_id, formation_state_id, formation_country_id, incorporation_id, user_id, created_at, created_by, updated_at, updated_by',
	WITH_STATE:
		'id, legal_name, entity_type, legal_status, management_type, incorporation_id, updated_at, formation_state:formation_state_id(name)',
} as const;

export interface CompanyRow {
	id: string;
	incorporation_id: string | null;
	user_id: string | null;
	legal_name: string | null;
	entity_type: CompanyEntityType;
	management_type: CompanyManagementType;
	legal_status: CompanyLegalStatus;
	tax_classification: string | null;
	identification_number: string | null;
	filing_number: string | null;
	formation_state_id: number | null;
	formation_country_id: number | null;
	activity_code_id: number | null;
	activity_description: string | null;
	us_source_income: boolean | null;
	joint_ownership: boolean | null;
	incorporation_date: string | null;
	irs_email: string | null;
	created_at: string | null;
	created_by: string | null;
	updated_at: string | null;
	updated_by: string | null;
}

export type CompanyInsert = Omit<
	Partial<CompanyRow>,
	'id' | 'created_at' | 'created_by' | 'updated_at' | 'updated_by'
> & {
	user_id: string;
	legal_status: CompanyLegalStatus;
};

export type CompanyUpdate = Partial<CompanyInsert>;
