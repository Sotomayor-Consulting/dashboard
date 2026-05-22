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

import type {
	AdminCompany,
	IncorporationsFilter,
} from '@modules/admin/lib/incorporation-types';

export type IncorporacionesColumnId =
	| 'client'
	| 'stage'
	| 'payment'
	| 'lastActivity'
	| 'actions';

export const INCORPORACIONES_COLUMN_LABELS: Record<IncorporacionesColumnId, string> = {
	client: 'Cliente',
	stage: 'Etapa',
	payment: 'Pago',
	lastActivity: 'Última actividad',
	actions: 'Acciones',
};

interface FilterDef {
	id: IncorporationsFilter;
	label: string;
	match: (c: AdminCompany) => boolean;
}

const FILTERS: FilterDef[] = [
	{ id: 'todas', label: 'Todas', match: () => true },
	{
		id: 'atencion',
		label: 'Requieren atención',
		match: (c) => c.priority !== 'normal' || c.paymentStatus === 'overdue',
	},
	{
		id: 'esperando_cliente',
		label: 'Esperando cliente',
		match: (c) => c.awaiting === 'cliente',
	},
	{
		id: 'esperando_ops',
		label: 'Esperando ops',
		match: (c) => c.awaiting === 'ops',
	},
	{
		id: 'estancadas',
		label: 'Estancadas',
		match: (c) =>
			(c.priority === 'urgent' && c.progress < 100) ||
			(c.daysInProcess !== null && c.daysInProcess > 30 && c.progress < 100),
	},
];

interface Props {
	companies: AdminCompany[];
	activeFilter: IncorporationsFilter;
	onFilterChange: (f: IncorporationsFilter) => void;
	search: string;
	onSearchChange: (s: string) => void;
	visibleColumns: Record<IncorporacionesColumnId, boolean>;
	onToggleColumn: (id: IncorporacionesColumnId) => void;
}

export function IncorporacionesToolbar({
	companies,
	activeFilter,
	onFilterChange,
	search,
	onSearchChange,
	visibleColumns,
	onToggleColumn,
}: Props) {
	return (
		<div className="border-b border-gray-200 px-7 py-3 dark:border-gray-800">
			<div className="flex items-center gap-2">
				<div className="relative w-64 shrink-0">
					<Icon
						icon="ri:search-line"
						className="pointer-events-none absolute top-1/2 left-2.5 z-10 h-4 w-4 -translate-y-1/2 text-gray-400"
					/>
					<Input
						value={search}
						onChange={(e) => onSearchChange(e.target.value)}
						placeholder="Buscar por nombre…"
						className="!h-9 !border-gray-200 !bg-transparent pl-8 text-sm dark:!border-gray-800 dark:!bg-transparent"
					/>
				</div>

				<div className="flex flex-1 items-center gap-1.5 overflow-x-auto">
					{FILTERS.map((f) => {
						const count = companies.filter(f.match).length;
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
							{(Object.keys(INCORPORACIONES_COLUMN_LABELS) as IncorporacionesColumnId[]).map(
								(id) => (
									<DropdownMenuCheckboxItem
										key={id}
										checked={visibleColumns[id]}
										onCheckedChange={() => onToggleColumn(id)}
									>
										{INCORPORACIONES_COLUMN_LABELS[id]}
									</DropdownMenuCheckboxItem>
								),
							)}
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</div>
		</div>
	);
}
