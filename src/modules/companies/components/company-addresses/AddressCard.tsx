import { Icon } from '@iconify/react';

import { cn } from '@components/utils';
import type { AddressItem } from '../../hooks/use-company-addresses';

interface Props {
	address: AddressItem;
	addressCardHeightClass?: string;
	onOpenDetail: (addressId: number) => void;
}

interface TypeMeta {
	label: string;
	icon: string;
	chipClass: string;
	iconClass: string;
}

const TYPE_MAP: Record<string, TypeMeta> = {
	operational: {
		label: 'Operativa',
		icon: 'ri:briefcase-line',
		chipClass:
			'border border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900/50 dark:bg-indigo-950/40 dark:text-indigo-300',
		iconClass:
			'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300',
	},
	mailing: {
		label: 'Correspondencia',
		icon: 'ri:mail-line',
		chipClass:
			'border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300',
		iconClass:
			'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
	},
	ein_request: {
		label: 'EIN',
		icon: 'ri:government-line',
		chipClass:
			'border border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300',
		iconClass:
			'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
	},
	other: {
		label: 'Otra',
		icon: 'ri:map-pin-line',
		chipClass:
			'border border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-700 dark:bg-neutral-900 dark:text-gray-300',
		iconClass:
			'bg-gray-100 text-gray-700 dark:bg-neutral-800 dark:text-gray-300',
	},
};

function getTypeMeta(raw: string): TypeMeta {
	const key = (raw || '').toLowerCase();
	return TYPE_MAP[key] ?? TYPE_MAP.other!;
}

function joinNonEmpty(parts: Array<string | null | undefined>, sep = ', ') {
	return parts.filter((p) => p && p.trim()).join(sep);
}

export default function AddressCard({ address, onOpenDetail }: Props) {
	const meta = getTypeMeta(address.type);
	const cityLine = joinNonEmpty([
		address.city,
		address.state ?? null,
		address.zip ?? null,
	]);

	return (
		<button
			type="button"
			onClick={() => onOpenDetail(address.id)}
			className={cn(
				'group/address-card relative flex w-full flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 text-left transition-all',
				'hover:border-gray-300 hover:shadow-sm',
				'dark:border-gray-800 dark:bg-neutral-950 dark:hover:border-gray-700',
				'focus-visible:ring-ring/50 focus-visible:ring-2 focus-visible:outline-none',
			)}
		>
			{/* Top: icon + type + chevron */}
			<div className="flex items-start justify-between gap-3">
				<div className="flex items-center gap-2.5">
					<span
						className={cn(
							'inline-flex size-8 shrink-0 items-center justify-center rounded-lg',
							meta.iconClass,
						)}
					>
						<Icon icon={meta.icon} className="size-4" />
					</span>
					<span
						className={cn(
							'inline-flex items-center rounded-md px-2 py-0.5 text-[10.5px] font-medium tracking-wide',
							meta.chipClass,
						)}
					>
						{meta.label}
					</span>
				</div>
				<Icon
					icon="ri:arrow-right-up-line"
					className="text-muted-foreground size-4 shrink-0 opacity-0 transition-opacity group-hover/address-card:opacity-100"
				/>
			</div>

			{/* Body: line1 / line2 */}
			<div className="flex flex-col gap-0.5">
				<p className="line-clamp-2 text-[13.5px] leading-snug font-medium text-gray-900 dark:text-gray-100">
					{address.line1 || (
						<span className="text-muted-foreground italic">Sin dirección</span>
					)}
				</p>
				{address.line2 ? (
					<p className="text-muted-foreground line-clamp-1 text-[12px]">
						{address.line2}
					</p>
				) : null}
			</div>

			{/* Footer: city / country */}
			<div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px]">
				{cityLine ? (
					<span className="text-gray-700 dark:text-gray-300">
						<Icon
							icon="ri:map-pin-2-line"
							className="-mt-0.5 mr-1 inline size-3 opacity-60"
						/>
						{cityLine}
					</span>
				) : null}
				{address.country ? (
					<span className="text-muted-foreground">
						<Icon
							icon="ri:earth-line"
							className="-mt-0.5 mr-1 inline size-3 opacity-60"
						/>
						{address.country}
					</span>
				) : null}
			</div>
		</button>
	);
}
