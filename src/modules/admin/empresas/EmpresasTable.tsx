import { Icon } from '@iconify/react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import { cn } from '@components/utils';

import type { AdminEmpresa } from '@modules/admin/lib/empresa-types';
import { EmptyState } from '@modules/admin/usuarios/cells/EmptyState';
import { InitialsAvatar } from '@modules/admin/usuarios/cells/InitialsAvatar';
import { EntityTypeBadge, LegalStatusBadge } from './cells/EntityBadge';

interface Props {
	empresas: AdminEmpresa[];
	selectedId: string | null;
	onSelect: (id: string) => void;
}

/**
 * Tabla de empresas legales (entidades constituidas).
 * Columnas: Razón social, Tipo, Estado USA, EIN, Filing #, Fecha, Status, Owner.
 */
export function EmpresasTable({ empresas, selectedId, onSelect }: Props) {
	if (empresas.length === 0) {
		return (
			<EmptyState
				icon="ri:building-line"
				title="Sin empresas"
				description="Las empresas aparecerán aquí una vez completen el proceso de incorporación."
			/>
		);
	}

	return (
		<div className="w-full overflow-x-auto">
			<table className="w-full text-sm">
				<thead className="border-b border-gray-200 text-[10.5px] font-medium tracking-wider text-gray-500 uppercase dark:border-gray-800 dark:text-gray-400">
					<tr>
						<th className="px-7 py-3 text-left">Razón social</th>
						<th className="py-3 pr-4 text-left">Tipo</th>
						<th className="py-3 pr-4 text-left">Estado USA</th>
						<th className="py-3 pr-4 text-left">EIN</th>
						<th className="py-3 pr-4 text-left">Filing #</th>
						<th className="py-3 pr-4 text-left">Incorporada</th>
						<th className="py-3 pr-4 text-left">Status</th>
						<th className="py-3 pr-7 text-left">Owner</th>
					</tr>
				</thead>
				<tbody>
					{empresas.map((e) => {
						const isSelected = selectedId === e.id;
						return (
							<tr
								key={e.id}
								onClick={() => onSelect(e.id)}
								className={cn(
									'group/row h-14 cursor-pointer border-b border-gray-100 transition-colors dark:border-gray-800/60',
									isSelected
										? 'bg-gray-100 dark:bg-neutral-900'
										: 'hover:bg-gray-50 dark:hover:bg-neutral-900/60',
								)}
							>
								<td className="px-7">
									<div className="flex items-center gap-2.5">
										<div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-gray-100 dark:bg-neutral-800">
											<Icon
												icon="ri:building-2-line"
												className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400"
											/>
										</div>
										<span className="truncate text-[13px] font-medium text-gray-900 dark:text-gray-100">
											{e.legalName}
										</span>
										<Icon
											icon="ri:arrow-right-line"
											className="h-3.5 w-3.5 shrink-0 text-gray-400 opacity-0 transition-opacity group-hover/row:opacity-100"
										/>
									</div>
								</td>
								<td className="pr-4">
									<EntityTypeBadge type={e.entityType} />
								</td>
								<td className="pr-4 text-[12.5px] text-gray-700 dark:text-gray-200">
									{e.formationState ?? <span className="text-gray-400">—</span>}
								</td>
								<td className="pr-4 font-mono text-[12px] tabular-nums text-gray-700 dark:text-gray-200">
									{e.ein ?? <span className="text-gray-400 font-sans italic">Pendiente</span>}
								</td>
								<td className="pr-4 font-mono text-[12px] tabular-nums text-gray-700 dark:text-gray-200">
									{e.filingNumber ?? <span className="text-gray-400 font-sans italic">—</span>}
								</td>
								<td className="pr-4 text-[12.5px] text-gray-700 dark:text-gray-200">
									{e.incorporationDate ? (
										format(new Date(e.incorporationDate), 'dd MMM yyyy', {
											locale: es,
										})
									) : (
										<span className="text-gray-400 italic">Sin fecha</span>
									)}
								</td>
								<td className="pr-4">
									<LegalStatusBadge status={e.legalStatus} />
								</td>
								<td className="pr-7">
									{e.owner ? (
										<div className="flex items-center gap-2">
											{e.owner.avatarUrl ? (
												<img
													src={e.owner.avatarUrl}
													alt={e.owner.name}
													className="h-6 w-6 shrink-0 rounded-full object-cover"
												/>
											) : (
												<InitialsAvatar
													name={e.owner.name}
													seed={e.owner.email || e.owner.id}
													size={24}
												/>
											)}
											<span className="truncate text-[12px] text-gray-700 dark:text-gray-200">
												{e.owner.name}
											</span>
										</div>
									) : (
										<span className="text-[11.5px] text-gray-400 italic">
											Sin owner
										</span>
									)}
								</td>
							</tr>
						);
					})}
				</tbody>
			</table>
		</div>
	);
}
