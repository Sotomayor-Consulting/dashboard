import { cn } from '@components/utils';

/**
 * Skeleton primitive (shadcn-style). Bloque gris pulsante para loading states.
 */
export function Skeleton({
	className,
	...props
}: React.HTMLAttributes<HTMLDivElement>) {
	return (
		<div
			data-slot="skeleton"
			className={cn(
				'animate-pulse rounded-md bg-gray-200 dark:bg-neutral-800',
				className,
			)}
			{...props}
		/>
	);
}
