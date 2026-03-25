import type { ColumnDef } from '@tanstack/react-table';
import * as Dictionaries from '../utils/dictionaries';
import type { CompanyTableRow } from '../types';
import { Button } from '@components/components/ui/button';

import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@components/components/ui/dropdown-menu';

import { Building, LogOutIcon, SettingsIcon, UserIcon } from 'lucide-react';

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
	{
		id: 'actions',
		cell: ({ row }) => {
			const id = row.id;
			return (
				<div>
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="outline">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="1em"
									height="1em"
									viewBox="0 0 24 24"
								>
									<path
										fill="currentColor"
										d="m12 15l-4.243-4.242l1.415-1.414L12 12.172l2.828-2.828l1.415 1.414z"
									/>
								</svg>
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent>
							<DropdownMenuItem>
								<Building />
								Profile
							</DropdownMenuItem>
							<DropdownMenuItem>
								<Building />
								Billing
							</DropdownMenuItem>
							<DropdownMenuItem>
								<SettingsIcon />
								Settings
							</DropdownMenuItem>
							<DropdownMenuSeparator />
							<DropdownMenuItem variant="destructive">
								<LogOutIcon />
								Log out
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			);
		},
	},
];
