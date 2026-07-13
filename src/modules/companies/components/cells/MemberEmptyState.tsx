import { Icon } from '@iconify/react';

interface Props {
	title: string;
	description: string;
}

export function MemberEmptyState({ title, description }: Props) {
	return (
		<div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
			<span className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-neutral-900">
				<Icon
					icon="ri:group-line"
					className="h-5 w-5 text-gray-500 dark:text-gray-400"
				/>
			</span>
			<p className="text-[13.5px] font-medium text-gray-800 dark:text-gray-200">
				{title}
			</p>
			<p className="max-w-sm text-[12px] text-gray-500 dark:text-gray-400">
				{description}
			</p>
		</div>
	);
}
