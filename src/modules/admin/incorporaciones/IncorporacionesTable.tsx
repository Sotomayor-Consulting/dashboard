import { Icon } from '@iconify/react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

import { SelectionCheckbox } from '@components/ui/SelectionCheckbox';
import { cn } from '@components/utils';

import type { AdminCompany } from '@modules/admin/lib/incorporation-types';
import { EmptyState } from '@modules/admin/usuarios/cells/EmptyState';
import { ClientCell } from './cells/ClientCell';
import { CompanyCell } from './cells/CompanyCell';
import { CompanyRowActions } from './cells/CompanyRowActions';
import { PaymentBadge } from './cells/PaymentBadge';
import { StageProgressCell } from './cells/StageProgressCell';
import type { IncorporacionesColumnId } from './IncorporacionesToolbar';

export type IncorporacionesSortKey =
	| 'name'
	| 'client'
	| 'progress'
	| 'lastActivity'
	| 'payment';
export type IncorporacionesSortDir = 'asc' | 'desc';

interface Props {
	companies: AdminCompany[];
	selectedId: string | null;
	onSelect: (id: string) => void;
	visibleColumns: Record<IncorporacionesColumnId, boolean>;
	sortKey: IncorporacionesSortKey;
	sortDir: IncorporacionesSortDir;
	onSort: (key: IncorporacionesSortKey) => void;
	selectionMode: 'none' | 'some' | 'all';
	onToggleAll: () => void;
	isSelected: (id: string) => boolean;
	onToggleRow: (id: string) => void;
}

function SortableTh({
	label,
	keyId,
	active,
	dir,
	onClick,
	className,
}: {
	label: string;
	keyId: IncorporacionesSortKey;
	active: boolean;
	dir: IncorporacionesSortDir;
	onClick: (k: IncorporacionesSortKey) => void;
	className?: string;
}) {
	return (
		<th className={className}>
			<button
				type="button"
				onClick={() => onClick(keyId)}
				className="inline-flex items-center gap-1 uppercase tracking-wider hover:text-gray-900 dark:hover:text-gray-100"
			>
				{label}
				{active && (
					<Icon
						icon={dir === 'asc' ? 'ri:arrow-up-s-line' : 'ri:arrow-down-s-line'}
						className="h-3.5 w-3.5"
					/>
				)}
			</button>
		</th>
	);
}

export function IncorporacionesTable({
	companies,
	selectedId,
	onSelect,
	visibleColumns,
	sortKey,
	sortDir,
	onSort,
	selectionMode,
	onToggleAll,
	isSelected,
	onToggleRow,
}: Props) {
	if (companies.length === 0) {
		return (
			<EmptyState
				icon="ri:building-line"
				title="Sin resultados"
				description="Ajusta los filtros o la búsqueda para encontrar empresas."
			/>
		);
	}

	return (
		<div className="w-full overflow-x-auto">
			<table className="w-full text-sm">
				<thead className="border-b border-gray-200 text-[10.5px] font-medium tracking-wider text-gray-500 uppercase dark:border-gray-800 dark:text-gray-400">
					<tr>
						<th className="w-10 px-7 py-3 text-left">
							<SelectionCheckbox
								mode="header"
								selectionMode={selectionMode}
								onToggle={onToggleAll}
							/>
						</th>
						<SortableTh
							label="Empresa"
							keyId="name"
							active={sortKey === 'name'}
							dir={sortDir}
							onClick={onSort}
							className="py-3 pr-4 text-left"
						/>
						{visibleColumns.client && (
							<SortableTh
								label="Cliente"
								keyId="client"
								active={sortKey === 'client'}
								dir={sortDir}
								onClick={onSort}
								className="py-3 pr-4 text-left"
							/>
						)}
						{visibleColumns.stage && (
							<SortableTh
								label="Etapa"
								keyId="progress"
								active={sortKey === 'progress'}
								dir={sortDir}
								onClick={onSort}
								className="py-3 pr-4 text-left"
							/>
						)}
						{visibleColumns.payment && (
							<SortableTh
								label="Pago"
								keyId="payment"
								active={sortKey === 'payment'}
								dir={sortDir}
								onClick={onSort}
								className="py-3 pr-4 text-left"
							/>
						)}
						{visibleColumns.lastActivity && (
							<SortableTh
								label="Actividad"
								keyId="lastActivity"
								active={sortKey === 'lastActivity'}
								dir={sortDir}
								onClick={onSort}
								className="py-3 pr-4 text-left"
							/>
						)}
						{visibleColumns.actions && (
							<th className="w-12 py-3 pr-7 text-right">
								<span className="sr-only">Acciones</span>
							</th>
						)}
					</tr>
				</thead>
				<tbody>
					{companies.map((c) => {
						const isOpen = selectedId === c.id;
						const rowSelected = isSelected(c.id);
						return (
							<tr
								key={c.id}
								onClick={() => onSelect(c.id)}
								className={cn(
									'h-14 cursor-pointer border-b border-gray-100 transition-colors dark:border-gray-800/60',
									isOpen || rowSelected
										? 'bg-gray-100 dark:bg-neutral-900'
										: 'hover:bg-gray-50 dark:hover:bg-neutral-900/60',
								)}
							>
								<td className="px-7" onClick={(ev) => ev.stopPropagation()}>
									<SelectionCheckbox
										mode="row"
										checked={rowSelected}
										onToggle={() => onToggleRow(c.id)}
									/>
								</td>
								<td className="pr-4">
									<CompanyCell company={c} />
								</td>
								{visibleColumns.client && (
									<td className="pr-4">
										<ClientCell client={c.client} />
									</td>
								)}
								{visibleColumns.stage && (
									<td className="pr-4">
										<StageProgressCell company={c} />
									</td>
								)}
								{visibleColumns.payment && (
									<td className="pr-4">
										<PaymentBadge
											status={c.paymentStatus}
											pendingDocs={c.pendingDocs}
										/>
									</td>
								)}
								{visibleColumns.lastActivity && (
									<td className="pr-4 text-[11.5px] text-gray-500 dark:text-gray-400">
										{c.lastActivityAt ? (
											formatDistanceToNow(new Date(c.lastActivityAt), {
												addSuffix: true,
												locale: es,
											})
										) : (
											<span className="italic">sin actividad</span>
										)}
									</td>
								)}
								{visibleColumns.actions && (
									<td className="pr-7 text-right">
										<CompanyRowActions company={c} />
									</td>
								)}
							</tr>
						);
					})}
				</tbody>
			</table>
		</div>
	);
}
