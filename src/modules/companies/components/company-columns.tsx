import type { ColumnDef } from '@tanstack/react-table';
import * as Dictionaries from '../utils/dictionaries';
import type { CompanyTableRow } from '../types';

export const columns: ColumnDef<CompanyTableRow>[] = [
	{ accessorKey: 'legal_name', header: 'Nombre' },
	{
		accessorKey: 'entity_type',
		header: 'Tipo de entidad',
		cell: ({ row }) => {
			const value = row.getValue(
				'entity_type',
			) as keyof typeof Dictionaries.entityTypeMap;
			return Dictionaries.entityTypeMap[value] || value;
		},
	},
	{
		accessorKey: 'tax_clasification',
		header: 'Tipo de tributación',
		cell: ({ row }) => {
			const value = row.getValue(
				'tax_clasification',
			) as keyof typeof Dictionaries.taxClassificationMap;
			return Dictionaries.taxClassificationMap[value] || value;
		},
	},
	{
		accessorKey: 'legal_status',
		header: 'Legal Status',
		cell: ({ row }) => {
			const value = row.getValue(
				'legal_status',
			) as keyof typeof Dictionaries.legalStatusMap;
			return Dictionaries.legalStatusMap[value] || value;
		},
	},
	{ accessorKey: 'formation_country', header: 'País' },
	{ accessorKey: 'formation_state', header: 'Jurisdicción' },
];
