import { Icon } from '@iconify/react';

import { cn } from '@components/utils';

import type { AwaitingActor } from '@modules/admin/lib/incorporation-types';

/**
 * Badge sutil que indica quién bloquea el avance del proceso.
 *  - cliente → ámbar (esperando input del cliente)
 *  - ops     → índigo (esperando acción interna)
 *  - none    → no renderiza
 */
export function AwaitingBadge({ awaiting }: { awaiting: AwaitingActor }) {
	if (awaiting === 'none') return null;
	const cliente = awaiting === 'cliente';
	return (
		<span
			className={cn(
				'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium',
				cliente
					? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
					: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300',
			)}
		>
			<Icon
				icon={cliente ? 'ri:user-line' : 'ri:tools-line'}
				className="h-3 w-3"
			/>
			{cliente ? 'Cliente' : 'Ops'}
		</span>
	);
}
