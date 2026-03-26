export type TaxClasification = 'disregarded_entity' | 'corporation';
export type Managmentype = 'member-managed' | 'manager-managed';
export type EntityLLC = 'llc';
export type LegalStatus = 'active' | 'inactive' | 'suspended' | 'pending' | 'dissolved';


export interface Company {
	id: string;
	legal_name: string | null | '';
	entity_type: string;
	formation_state_id: number;
	formation_country_id: number;
	tax_clasification: TaxClasification;
	management_type: Managmentype;
	activity_code_id: number;
	activity_description: string;
	activity_service: string;
	us_source_income: Boolean;
	joint_ownership: Boolean;
	incorporation_date: Date | null;
	irs_email: string;
	legal_status: string;
	created_at: Date | null;
	created_by: string;
	updated_at: Date | null;
	updated_by: string;
}

export type CompanyTableRow = Omit<Company, 'formation_country_id'> & {
	formation_country: string;
};
