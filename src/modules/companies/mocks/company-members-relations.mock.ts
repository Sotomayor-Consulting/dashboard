export interface CompanyMemberRelationMock {
	id: string;
	company_id: string;
	member_id: string;
	is_member: boolean;
	is_manager: boolean;
	percentage: number | null;
	is_active: boolean;
	source_type: 'member' | 'external';
}

export const mockCompanyMembersRelations: CompanyMemberRelationMock[] = [
	{
		id: 'rel-001',
		company_id: 'empresa-demo-001',
		member_id: 'member-ana',
		is_member: true,
		is_manager: true,
		percentage: 40,
		is_active: true,
		source_type: 'member',
	},
	{
		id: 'rel-002',
		company_id: 'empresa-demo-001',
		member_id: 'member-carlos',
		is_member: true,
		is_manager: false,
		percentage: 35,
		is_active: true,
		source_type: 'member',
	},
	{
		id: 'rel-003',
		company_id: 'empresa-demo-001',
		member_id: 'member-blueharbor',
		is_member: true,
		is_manager: false,
		percentage: 25,
		is_active: true,
		source_type: 'member',
	},
	{
		id: 'rel-004',
		company_id: 'empresa-demo-001',
		member_id: 'member-external-manager',
		is_member: false,
		is_manager: true,
		percentage: null,
		is_active: true,
		source_type: 'external',
	},
];
