import { Icon } from '@iconify/react';

import { Tooltip, TooltipContent, TooltipTrigger } from '@components/ui/Tooltip';

import type { CompanyPriority } from '@modules/admin/lib/incorporation-types';

/**
 * Icono pequeño de prioridad (banderita roja/ámbar) cuando NO es normal.
 * En 'normal' devuelve null para no contaminar visualmente.
 */
export function PriorityIcon({ priority }: { priority: CompanyPriority }) {
	if (priority === 'normal') return null;
	const color =
		priority === 'urgent'
			? 'text-red-500 dark:text-red-400'
			: 'text-amber-500 dark:text-amber-400';
	const label =
		priority === 'urgent'
			? 'Urgente: sin actividad reciente'
			: 'Atención: actividad atrasada';
	return (
		<Tooltip>
			<TooltipTrigger
				render={
					<span className="shrink-0">
						<Icon
							icon="ri:flag-fill"
							className={`h-3 w-3 ${color}`}
							aria-label={label}
						/>
					</span>
				}
			/>
			<TooltipContent>{label}</TooltipContent>
		</Tooltip>
	);
}
