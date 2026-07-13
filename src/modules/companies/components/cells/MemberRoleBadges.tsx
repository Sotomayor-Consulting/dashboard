import { Badge } from '@components/ui/Badge';
import { cn } from '@components/utils';
import type { CompanyMemberItem } from '../../types';

const SOCIO_CLASS =
	'border border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900/50 dark:bg-indigo-950/40 dark:text-indigo-300';
const MANAGER_CLASS =
	'border border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-400';

const BADGE_BASE =
	'rounded-md px-2 py-0.5 text-[10.5px] font-medium tracking-wide';

export function MemberRoleBadges({ row }: { row: CompanyMemberItem }) {
	const roles: { label: string; cls: string }[] = [];
	if (row.is_member) roles.push({ label: 'Socio', cls: SOCIO_CLASS });
	if (row.is_manager) roles.push({ label: 'Manager', cls: MANAGER_CLASS });

	if (roles.length === 0) {
		return <span className="text-[11.5px] text-gray-400 italic">Sin rol</span>;
	}

	return (
		<div className="flex flex-wrap gap-1">
			{roles.map((r) => (
				<Badge key={r.label} className={cn(BADGE_BASE, r.cls)}>
					{r.label}
				</Badge>
			))}
		</div>
	);
}
