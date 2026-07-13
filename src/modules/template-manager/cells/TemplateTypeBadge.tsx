import { cn } from '@components/utils';

import type { TemplateType } from '@domains/templates/types';

const TONES: Record<TemplateType, string> = {
	pdf: 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400',
	word: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400',
};

export function TemplateTypeBadge({ type }: { type: TemplateType }) {
	return (
		<span
			className={cn(
				'inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-mono text-[10.5px] font-medium uppercase tracking-wider',
				TONES[type],
			)}
		>
			{type}
		</span>
	);
}
