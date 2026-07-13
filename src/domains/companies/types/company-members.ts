import type { MemberRow } from '@domains/members/types/member';

export interface CompanyMemberInput {
	member_id: string;
	percentage?: number | null;
	start_date?: string | null;
	is_member?: boolean;
	is_manager?: boolean;
}

export const COMPANY_MEMBER_COLUMNS = {
	BASE: 'id, company_id, member_id, percentage, start_date, end_date, is_member, is_manager, is_active, created_at, created_by, updated_at, updated_by',
	WITH_MEMBER: (memberColumns: string) =>
		`id, company_id, member_id, percentage, start_date, end_date, is_member, is_manager, is_active, created_at, created_by, updated_at, updated_by, member:members(${memberColumns})`,
} as const;

export interface CompanyMemberRow {
	id: number;
	company_id: string;
	member_id: string;
	percentage: number | null;
	start_date: string | null;
	end_date: string | null;
	is_member: boolean;
	is_manager: boolean;
	is_active: boolean | null;
	created_at: string;
	created_by: string | null;
	updated_at: string | null;
	updated_by: string | null;
	member?: MemberRow | null;
}

export type CompanyMemberInsert = Omit<
	Partial<CompanyMemberRow>,
	'id' | 'created_at' | 'created_by' | 'updated_at' | 'updated_by' | 'member'
> & {
	company_id: string;
	member_id: string;
};

export type CompanyMemberUpdate = Partial<CompanyMemberInsert>;
