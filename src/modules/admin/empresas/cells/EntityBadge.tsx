import { cn } from '@components/utils';

/**
 * Badges de tipo de entidad y estado legal de una empresa.
 * Única fuente de verdad — los consume la tabla admin de empresas y el
 * header de CompanyPage (CompanyInfoSection).
 */

const ENTITY_CLASS: Record<string, string> = {
	llc: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300',
	corp: 'bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300',
	'c-corp':
		'bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300',
	's-corp':
		'bg-fuchsia-50 text-fuchsia-700 dark:bg-fuchsia-950/40 dark:text-fuchsia-300',
	lp: 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300',
};

const STATUS_CLASS: Record<
	string,
	{ label: string; cls: string; dot: string }
> = {
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
	pending: {
		label: 'Pendiente',
		cls: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
		dot: 'bg-amber-500',
	},
	pending_validation: {
		label: 'Pendiente validación',
		cls: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
		dot: 'bg-amber-500',
	},
	suspended: {
		label: 'Suspendida',
		cls: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
		dot: 'bg-amber-500',
	},
	inactive: {
		label: 'Inactiva',
		cls: 'bg-gray-100 text-gray-600 dark:bg-neutral-800 dark:text-gray-400',
		dot: 'bg-gray-400',
	},
	dissolved: {
		label: 'Disuelta',
		cls: 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400',
		dot: 'bg-red-500',
	},
};

export function EntityTypeBadge({ type }: { type: string | null }) {
	if (!type) return <span className="text-[11.5px] text-gray-400">—</span>;
	return (
		<span
			className={cn(
				'inline-flex items-center rounded-md px-2 py-0.5 text-[10.5px] font-semibold tracking-wide uppercase',
				ENTITY_CLASS[type.toLowerCase()] ??
					'bg-gray-100 text-gray-600 dark:bg-neutral-800 dark:text-gray-400',
			)}
		>
			{type.toUpperCase()}
		</span>
	);
}

export function LegalStatusBadge({ status }: { status: string }) {
	const s = STATUS_CLASS[status.toLowerCase()] ?? STATUS_CLASS['draft']!;
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
