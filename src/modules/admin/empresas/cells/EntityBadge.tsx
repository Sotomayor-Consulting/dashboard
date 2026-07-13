import { cn } from '@components/utils';

import type {
	EntityType,
	LegalStatus,
} from '@modules/admin/lib/empresa-types';

const ENTITY_CLASS: Record<string, string> = {
	llc: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300',
	corp: 'bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300',
	'c-corp': 'bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300',
	's-corp': 'bg-fuchsia-50 text-fuchsia-700 dark:bg-fuchsia-950/40 dark:text-fuchsia-300',
};

const STATUS_CLASS: Record<LegalStatus, { label: string; cls: string; dot: string }> = {
	active: {
		label: 'Activa',
		cls: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
		dot: 'bg-emerald-500',
	},
	draft: {
		label: 'Borrador',
		cls: 'bg-gray-100 text-gray-600 dark:bg-neutral-800 dark:text-gray-400',
		dot: 'bg-gray-400',
	},
	suspended: {
		label: 'Suspendida',
		cls: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
		dot: 'bg-amber-500',
	},
	dissolved: {
		label: 'Disuelta',
		cls: 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400',
		dot: 'bg-red-500',
	},
};

export function EntityTypeBadge({ type }: { type: EntityType | null }) {
	if (!type) return <span className="text-[11.5px] text-gray-400">—</span>;
	return (
		<span
			className={cn(
				'inline-flex items-center rounded-md px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide',
				ENTITY_CLASS[type] ??
					'bg-gray-100 text-gray-600 dark:bg-neutral-800 dark:text-gray-400',
			)}
		>
			{type.toUpperCase()}
		</span>
	);
}

export function LegalStatusBadge({ status }: { status: LegalStatus }) {
	const s = STATUS_CLASS[status];
	return (
		<span
			className={cn(
				'inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[10.5px] font-medium',
				s.cls,
			)}
		>
			<span className={cn('h-1.5 w-1.5 rounded-full', s.dot)} />
			{s.label}
		</span>
	);
}
