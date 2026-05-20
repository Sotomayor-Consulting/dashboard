export interface MemberDirectoryItem {
	id: string;
	name: string;
	email: string;
	country: string;
}

export const mockMembersDirectory: MemberDirectoryItem[] = [
	{
		id: 'member-ana',
		name: 'Ana Sofia Martinez',
		email: 'ana.martinez@example.com',
		country: 'Mexico',
	},
	{
		id: 'member-carlos',
		name: 'Carlos Eduardo Rivas',
		email: 'carlos.rivas@example.com',
		country: 'Colombia',
	},
	{
		id: 'member-blueharbor',
		name: 'Blue Harbor Ventures LLC',
		email: 'legal@blueharbor.example',
		country: 'United States',
	},
];
