import { Icon } from '@iconify/react';

import type { AdminCompany } from '@modules/admin/lib/incorporation-types';
import { AwaitingBadge } from './AwaitingBadge';
import { PriorityIcon } from './PriorityIcon';

/**
 * Celda principal de empresa en proceso: icono + nombre + meta línea.
 * Junto al nombre: bandera de prioridad y badge de "esperando cliente/ops".
 */
export function CompanyCell({ company }: { company: AdminCompany }) {
	return (
		<div className="group/cell flex min-w-0 items-start gap-2.5">
			<div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-gray-100 dark:bg-neutral-800">
				<Icon
					icon="ri:building-2-line"
					className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400"
				/>
			</div>
			<div className="flex min-w-0 flex-col leading-tight">
				<div className="flex items-center gap-1.5">
					<span className="truncate text-[13px] font-medium text-gray-900 dark:text-gray-100">
						{company.name}
					</span>
					<PriorityIcon priority={company.priority} />
					<AwaitingBadge awaiting={company.awaiting} />
					<Icon
						icon="ri:arrow-right-line"
						className="h-3.5 w-3.5 shrink-0 text-gray-400 opacity-0 transition-opacity group-hover/cell:opacity-100"
					/>
				</div>
				<div className="mt-0.5 truncate text-[11.5px] text-gray-500 dark:text-gray-400">
					{company.type ?? '—'} · {company.stateUs ?? 'Sin estado'}
				</div>
			</div>
		</div>
	);
}
