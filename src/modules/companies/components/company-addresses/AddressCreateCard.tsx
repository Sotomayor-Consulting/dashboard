import { Icon } from '@iconify/react';

import { cn } from '@components/utils';

interface Props {
	canEditDetails: boolean;
	addressCardHeightClass?: string;
	onClick: () => void;
}

export default function AddressCreateCard({ canEditDetails, onClick }: Props) {
	return (
		<button
			type="button"
			onClick={onClick}
			disabled={!canEditDetails}
			className={cn(
				'group/address-create flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50 p-6 transition-colors',
				'hover:border-gray-300 hover:bg-gray-50',
				'dark:border-gray-800 dark:bg-neutral-950/40 dark:hover:border-gray-700 dark:hover:bg-neutral-900/60',
				'disabled:cursor-not-allowed disabled:opacity-50',
				'focus-visible:ring-ring/50 focus-visible:ring-2 focus-visible:outline-none',
			)}
		>
			<span className="flex size-10 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-colors group-hover/address-create:bg-gray-200 group-hover/address-create:text-gray-700 dark:bg-neutral-800 dark:text-gray-400 dark:group-hover/address-create:bg-neutral-700 dark:group-hover/address-create:text-gray-200">
				<Icon icon="ri:add-line" className="size-5" />
			</span>
			<span className="text-[13px] font-medium text-gray-700 dark:text-gray-200">
				Agregar dirección
			</span>
			<span className="text-muted-foreground text-[11.5px]">
				Operativa, legal, fiscal u otra
			</span>
		</button>
	);
}
