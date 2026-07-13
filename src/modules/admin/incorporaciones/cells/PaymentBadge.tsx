import { Icon } from '@iconify/react';

import { cn } from '@components/utils';

import type { PaymentStatus } from '@modules/admin/lib/incorporation-types';

const STYLE: Record<
	PaymentStatus,
	{ label: string; cls: string; dot: string }
> = {
	paid: {
		label: 'Pagado',
		cls: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
		dot: 'bg-emerald-500',
	},
	pending: {
		label: 'Pendiente',
		cls: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
		dot: 'bg-amber-500',
	},
	overdue: {
		label: 'Vencido',
		cls: 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400',
		dot: 'bg-red-500',
	},
	upgrade: {
		label: 'Upgrade',
		cls: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300',
		dot: 'bg-indigo-500',
	},
	unpaid: {
		label: 'Sin pago',
		cls: 'bg-gray-100 text-gray-600 dark:bg-neutral-800 dark:text-gray-400',
		dot: 'bg-gray-400',
	},
};

interface Props {
	status: PaymentStatus;
	pendingDocs?: number;
}

/**
 * Badge de estado de pago + chip warning con count de docs pendientes si los hay.
 */
export function PaymentBadge({ status, pendingDocs = 0 }: Props) {
	const s = STYLE[status];
	return (
		<div className="flex items-center gap-1.5">
			<span
				className={cn(
					'inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[10.5px] font-medium',
					s.cls,
				)}
			>
				<span className={cn('h-1.5 w-1.5 rounded-full', s.dot)} />
				{s.label}
			</span>
			{pendingDocs > 0 && (
				<span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-1.5 py-0.5 text-[10.5px] font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
					<Icon icon="ri:file-text-line" className="h-3 w-3" />
					{pendingDocs}
				</span>
			)}
		</div>
	);
}
