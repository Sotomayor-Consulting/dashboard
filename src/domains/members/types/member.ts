export const MEMBER_COLUMNS = {
	BASE: 'id, user_id, first_name, last_name, name, person_type, identification_type, identification_number, marital_status, birth_date, incorporation_date, country_nationality_id, country_residence_id, country_id, ssn, itin, created_at, updated_at',
} as const;

export type MemberPersonType = 'individual' | 'entity';
export type MemberIdentificationType = 'passport' | 'drivers_license' | 'id' | 'ein';
export type MemberMaritalStatusType =
	| 'single'
	| 'married'
	| 'widowed'
	| 'divorced'
	| 'legally_separated'
	| 'civil_union'
	| 'annulled'
	| null;

export interface MemberRow {
	id: string;
	user_id: string | null;
	first_name: string | null;
	last_name: string | null;
	name: string | null;
	person_type: MemberPersonType;
	identification_type: MemberIdentificationType;
	identification_number: string | null;
	marital_status: MemberMaritalStatusType;
	birth_date: string | null;
	incorporation_date: string | null;
	country_nationality_id: number | null;
	country_residence_id: number | null;
	country_id: number | null;
	ssn: string | null;
	itin: string | null;
	created_at: string;
	updated_at: string | null;
}

export type MemberInsert = Omit<MemberRow, 'id' | 'created_at'> & {
	person_type?: MemberPersonType;
	identification_type?: MemberIdentificationType;
};

export type MemberUpdate = Partial<MemberInsert>;
