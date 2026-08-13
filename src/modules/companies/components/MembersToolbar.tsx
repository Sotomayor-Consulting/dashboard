import { Icon } from '@iconify/react';

import { Button } from '@components/ui/Button';
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuTrigger,
} from '@components/ui/DropdownMenu';
import { Input } from '@components/ui/Input';
import { cn } from '@components/utils';

import type { CompanyMemberItem } from '../types';

export const MEMBERS_FILTERS = ['todos', 'managers', 'socios'] as const;
export type MembersFilter = (typeof MEMBERS_FILTERS)[number];

export const MEMBERS_COLUMN_IDS = [
	'identification_type',
	'identification_number',
	'type',
	'percentage',
	'start_date',
	'role',
	'actions',
] as const;
export type MembersColumnId = (typeof MEMBERS_COLUMN_IDS)[number];

export const MEMBERS_COLUMN_LABELS: Record<MembersColumnId, string> = {
	identification_type: 'Tipo de ID',
	identification_number: 'Nº de identificación',
	type: 'Tipo',
	percentage: 'Porcentaje',
	start_date: 'Fecha inicio',
	role: 'Rol',
	actions: 'Acciones',
};

interface FilterDef {
	id: MembersFilter;
	label: string;
	match: (row: CompanyMemberItem) => boolean;
}

const FILTERS: FilterDef[] = [
	{ id: 'todos', label: 'Todos', match: () => true },
	{
		id: 'managers',
		label: 'Managers',
		match: (row) => row.is_manager,
	},
	{
		id: 'socios',
		label: 'Socios',
		match: (row) => row.is_member,
	},
];

interface Props {
	rows: CompanyMemberItem[];
	activeFilter: MembersFilter;
	onFilterChange: (filter: MembersFilter) => void;
	search: string;
	onSearchChange: (s: string) => void;
	visibleColumns: Record<MembersColumnId, boolean>;
	onToggleColumn: (id: MembersColumnId) => void;
}

/**
 * Toolbar de la tabla de miembros, alineada con la de `/admin/usuarios`:
 * input de búsqueda + filtro pills con contadores + dropdown de columnas.
 */
export function MembersToolbar({
	rows,
	activeFilter,
	onFilterChange,
	search,
	onSearchChange,
	visibleColumns,
	onToggleColumn,
}: Props) {
	return (
		<div className="border-border border-b px-7 py-3">
			<div className="flex items-center gap-2">
				<div className="relative w-64 shrink-0">
					<Icon
						icon="ri:search-line"
						className="pointer-events-none absolute top-1/2 left-2.5 z-10 h-4 w-4 -translate-y-1/2 text-gray-400"
					/>
					<Input
						value={search}
						onChange={(e) => onSearchChange(e.target.value)}
						placeholder="Buscar por nombre, identificación…"
						className="!h-9 !border-gray-200 !bg-transparent pl-8 text-sm dark:!border-gray-800 dark:!bg-transparent"
					/>
				</div>

				<div className="flex flex-1 scrollbar-thin items-center gap-1.5 overflow-x-auto">
					{FILTERS.map((f) => {
						const count = rows.filter(f.match).length;
						const isActive = activeFilter === f.id;
						return (
							<button
								key={f.id}
								type="button"
								onClick={() => onFilterChange(f.id)}
								className={cn(
									'inline-flex shrink-0 items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors',
									isActive
										? 'border-gray-900 bg-gray-900 text-white dark:border-white dark:bg-white dark:text-gray-900'
										: 'border-gray-200 bg-transparent text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-neutral-800',
								)}
							>
								<span>{f.label}</span>
								<span
									className={cn(
										'rounded px-1 text-[10.5px] tabular-nums',
										isActive
											? 'bg-white/15 text-current'
											: 'bg-gray-100 text-gray-500 dark:bg-neutral-800 dark:text-gray-400',
									)}
								>
									{count}
								</span>
							</button>
						);
					})}
				</div>

				<div className="ml-auto shrink-0">
					<DropdownMenu>
						<DropdownMenuTrigger
							render={
								<Button variant="outline" size="sm" className="gap-1.5" />
							}
						>
							<Icon icon="ri:layout-column-line" className="h-4 w-4" />
							Columnas
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end" className="w-48">
							{MEMBERS_COLUMN_IDS.map((id) => (
								<DropdownMenuCheckboxItem
									key={id}
									checked={visibleColumns[id]}
									onCheckedChange={() => onToggleColumn(id)}
								>
									{MEMBERS_COLUMN_LABELS[id]}
								</DropdownMenuCheckboxItem>
							))}
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</div>
		</div>
	);
}

export const matchMembersFilter = (
	row: CompanyMemberItem,
	filter: MembersFilter,
): boolean => {
	const def = FILTERS.find((f) => f.id === filter);
	return def ? def.match(row) : true;
};
