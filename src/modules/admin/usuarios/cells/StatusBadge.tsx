import { cn } from '@components/utils';

/**
 * Badge de estado de cuenta con status dot (verde/ámbar).
 */
export function StatusBadge({ status }: { status: 'active' | 'pending' }) {
	const isActive = status === 'active';
	return (
		<span
			className={cn(
				'inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[10.5px] font-medium',
				isActive
					? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
					: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
			)}
		>
			<span
				className={cn(
					'h-1.5 w-1.5 rounded-full',
					isActive ? 'bg-emerald-500' : 'bg-amber-500',
				)}
			/>
			{isActive ? 'Activo' : 'Pendiente'}
		</span>
	);
}
