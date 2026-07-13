export type CompanyAddressType = 'operational' | 'mailing' | 'ein_request' | 'other';

export const COMPANY_ADDRESS_COLUMNS = {
	BASE: 'id, company_id, type, line1, line2, city, county, zip, country_id, state_id, created_at, updated_at',
	WITH_RELATIONS: `*, country:country_id(id, name, iso), state_ref:state_id(id, name, code)`,
} as const;

export interface CompanyAddressInput {
	type: string;
	line1: string;
	line2?: string | null;
	city: string;
	county?: string | null;
	zip?: string | null;
	country_id: number;
	state_id?: number | null;
	country?: string | null;
}

export interface CompanyAddressRow {
	id: number;
	company_id: string | null;
	type: CompanyAddressType;
	line1: string;
	line2: string | null;
	city: string;
	county: string | null;
	zip: string | null;
	country_id: number;
	state_id: number | null;
	created_at: string;
	updated_at: string | null;
	country?: string | null;
	state?: string | null;
}

export type CompanyAddressInsert = Omit<
	Partial<CompanyAddressRow>,
	'id' | 'created_at' | 'updated_at'
> & {
	company_id: string;
	type: CompanyAddressType;
	line1: string;
	city: string;
	country_id: number;
};

export type CompanyAddressUpdate = Partial<CompanyAddressInsert>;
