import { cn } from '@components/utils';

import type { TemplateWithDocument } from '@domains/templates/types';

type Status = 'active' | 'inactive' | 'deleted';

function resolveStatus(t: TemplateWithDocument): Status {
	if (t.deleted_at) return 'deleted';
	if (!t.is_active) return 'inactive';
	return 'active';
}

const LABELS: Record<Status, string> = {
	active: 'Activa',
	inactive: 'Inactiva',
	deleted: 'Papelera',
};

const TONES: Record<Status, { dot: string; chip: string }> = {
	active: {
		dot: 'bg-emerald-500',
		chip: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
	},
	inactive: {
		dot: 'bg-amber-500',
		chip: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
	},
	deleted: {
		dot: 'bg-red-500',
		chip: 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400',
	},
};

export function TemplateStatusBadge({ template }: { template: TemplateWithDocument }) {
	const status = resolveStatus(template);
	const tone = TONES[status];
	return (
		<span
			className={cn(
				'inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[10.5px] font-medium',
				tone.chip,
			)}
		>
			<span className={cn('h-1.5 w-1.5 rounded-full', tone.dot)} />
			{LABELS[status]}
		</span>
	);
}
