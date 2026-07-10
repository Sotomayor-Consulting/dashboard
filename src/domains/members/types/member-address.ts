export type MemberAddressType = 'residential' | 'mailing' | 'business' | 'other';

export const MEMBER_ADDRESS_COLUMNS = {
	BASE: 'id, member_id, type, line1, line2, city, state_id, country_id, zip, is_primary, created_at, created_by, updated_at, updated_by',
} as const;

export interface MemberAddressRow {
	id: number;
	member_id: string;
	type: MemberAddressType;
	line1: string;
	line2: string | null;
	city: string | null;
	state_id: number | null;
	country_id: number | null;
	zip: string | null;
	is_primary: boolean;
	created_at: string;
	created_by: string | null;
	updated_at: string | null;
	updated_by: string | null;
}

export type MemberAddressInsert = Omit<
	MemberAddressRow,
	'id' | 'created_at' | 'created_by' | 'updated_at' | 'updated_by'
>;

export type MemberAddressUpdate = Partial<MemberAddressInsert>;
