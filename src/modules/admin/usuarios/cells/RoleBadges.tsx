import { Badge } from '@components/ui/Badge';
import { cn } from '@components/utils';

import type { AnyRoleName } from '@modules/admin/lib/types';

/**
 * Variants por rol (spec del handoff):
 *   admin       → danger (rojo)
 *   operaciones → info   (índigo/azul)
 *   cliente     → subtle (neutral con borde)
 *   otros       → neutral
 */
const ROLE_CLASS: Record<string, string> = {
	admin:
		'border border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400',
	operaciones:
		'border border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900/50 dark:bg-indigo-950/40 dark:text-indigo-300',
	operations:
		'border border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900/50 dark:bg-indigo-950/40 dark:text-indigo-300',
	cliente:
		'border border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-700 dark:bg-neutral-900 dark:text-gray-300',
	client:
		'border border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-700 dark:bg-neutral-900 dark:text-gray-300',
};

const DEFAULT_CLASS =
	'border border-gray-200 bg-gray-50 text-gray-600 dark:border-gray-800 dark:bg-neutral-900 dark:text-gray-400';

export function RoleBadges({ roles }: { roles: AnyRoleName[] }) {
	if (roles.length === 0) {
		return (
			<span className="text-[11.5px] text-gray-400 italic">Sin roles</span>
		);
	}
	return (
		<div className="flex flex-wrap gap-1">
			{roles.map((r) => (
				<Badge
					key={r}
					className={cn(
						'rounded-md px-2 py-0.5 text-[10.5px] font-medium tracking-wide',
						ROLE_CLASS[r] ?? DEFAULT_CLASS,
					)}
				>
					{r}
				</Badge>
			))}
		</div>
	);
}
