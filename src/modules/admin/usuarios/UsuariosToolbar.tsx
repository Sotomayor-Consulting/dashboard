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

import type { AdminUser, UserFilter } from '@modules/admin/lib/types';

export type ColumnId = 'country' | 'status' | 'roles' | 'actions';

export const COLUMN_LABELS: Record<ColumnId, string> = {
	country: 'País',
	status: 'Estado',
	roles: 'Roles',
	actions: 'Acciones',
};

interface FilterDef {
	id: UserFilter;
	label: string;
	match: (u: AdminUser) => boolean;
}

const FILTERS: FilterDef[] = [
	{ id: 'todos', label: 'Todos', match: () => true },
	{
		id: 'cliente',
		label: 'Cliente',
		match: (u) => u.roles.some((r) => r === 'cliente' || r === 'client'),
	},
	{
		id: 'ops',
		label: 'Operaciones',
		match: (u) =>
			u.roles.some((r) => r === 'operaciones' || r === 'operations'),
	},
	{ id: 'admin', label: 'Admin', match: (u) => u.roles.includes('admin') },
	{
		id: 'partner',
		label: 'Partner',
		match: (u) => u.roles.includes('partner'),
	},
	{ id: 'sin', label: 'Sin actividad', match: (u) => u.lastSignInAt === null },
];

interface Props {
	users: AdminUser[];
	activeFilter: UserFilter;
	onFilterChange: (f: UserFilter) => void;
	search: string;
	onSearchChange: (s: string) => void;
	visibleColumns: Record<ColumnId, boolean>;
	onToggleColumn: (id: ColumnId) => void;
}

export function UsuariosToolbar({
	users,
	activeFilter,
	onFilterChange,
	search,
	onSearchChange,
	visibleColumns,
	onToggleColumn,
}: Props) {
	return (
		<div className="border-b border-border px-7 py-3">
			<div className="flex flex-wrap items-center gap-2">
				<div className="relative w-64 shrink-0">
					<Icon
						icon="ri:search-line"
						className="pointer-events-none absolute top-1/2 left-2.5 z-10 h-4 w-4 -translate-y-1/2 text-gray-400"
					/>
					<Input
						value={search}
						onChange={(e) => onSearchChange(e.target.value)}
						placeholder="Buscar por nombre, email…"
						className="!h-9 !border-gray-200 !bg-transparent pl-8 text-sm dark:!border-gray-800 dark:!bg-transparent"
					/>
				</div>

				<div className="flex scrollbar-thin flex-wrap items-center gap-1.5 overflow-x-auto">
					{FILTERS.map((f) => {
						const count = users.filter(f.match).length;
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

				<div className="shrink-0 md:ml-auto">
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
							{(Object.keys(COLUMN_LABELS) as ColumnId[]).map((id) => (
								<DropdownMenuCheckboxItem
									key={id}
									checked={visibleColumns[id]}
									onCheckedChange={() => onToggleColumn(id)}
								>
									{COLUMN_LABELS[id]}
								</DropdownMenuCheckboxItem>
							))}
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</div>
		</div>
	);
}
