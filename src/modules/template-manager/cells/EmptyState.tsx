import { Icon } from '@iconify/react';

import { Button } from '@components/ui/Button';

interface Props {
	icon?: string;
	title: string;
	description?: string;
	action?: { label: string; icon?: string; onClick: () => void };
}

/** Empty state centrado para la tabla de plantillas. */
export function EmptyState({
	icon = 'ri:file-list-3-line',
	title,
	description,
	action,
}: Props) {
	return (
		<div className="flex flex-col items-center justify-center px-7 py-16 text-center">
			<div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-neutral-900">
				<Icon icon={icon} className="h-7 w-7 text-gray-400 dark:text-gray-500" />
			</div>
			<p className="text-[14px] font-medium text-gray-900 dark:text-gray-100">{title}</p>
			{description && (
				<p className="mt-1.5 max-w-sm text-[12.5px] text-gray-500 dark:text-gray-400">
					{description}
				</p>
			)}
			{action && (
				<Button size="sm" className="mt-5 gap-1.5" onClick={action.onClick}>
					{action.icon && <Icon icon={action.icon} className="h-4 w-4" />}
					{action.label}
				</Button>
			)}
		</div>
	);
}
