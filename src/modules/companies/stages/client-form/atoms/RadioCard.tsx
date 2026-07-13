import type { ReactNode } from 'react';

import { cn } from '@components/utils';

interface Props {
	label: string;
	sub?: ReactNode;
	selected: boolean;
	onClick: () => void;
	disabled?: boolean;
	/** Si true, el card ocupa el ancho disponible (flex-1 dentro de un row). */
	fill?: boolean;
}

/**
 * Radio card grande: padding 14×16, border 1.5px, dot 18px.
 * Cuando `selected`, border = ink y se rellena el dot interno.
 *
 * Funciona con teclado: el `<button>` recibe focus y se activa con Enter/Space.
 */
export function RadioCard({
	label,
	sub,
	selected,
	onClick,
	disabled,
	fill = true,
}: Props) {
	return (
		<button
			type="button"
			role="radio"
			aria-checked={selected}
			disabled={disabled}
			onClick={onClick}
			className={cn(
				'flex items-start gap-3 rounded-[10px] border-[1.5px] p-[14px_16px] text-left transition-all',
				fill && 'flex-1',
				disabled && 'cursor-not-allowed opacity-50',
				!disabled && 'cursor-pointer',
			)}
			style={{
				borderColor: selected ? 'var(--cf-ink)' : 'var(--cf-line)',
				background: 'var(--cf-bg-card)',
			}}
		>
			<span
				className="mt-[1px] grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border-[1.5px]"
				style={{
					borderColor: selected ? 'var(--cf-ink)' : 'var(--cf-line-strong)',
					background: 'var(--cf-bg-card)',
				}}
			>
				{selected && (
					<span
						className="block h-[9px] w-[9px] rounded-full"
						style={{ background: 'var(--cf-ink)' }}
					/>
				)}
			</span>
			<span className="min-w-0">
				<span
					className="block text-[14px] font-semibold tracking-[-0.005em]"
					style={{ color: 'var(--cf-ink)' }}
				>
					{label}
				</span>
				{sub && (
					<span
						className="mt-[3px] block text-[12.5px] leading-[1.45]"
						style={{ color: 'var(--cf-ink-mute)' }}
					>
						{sub}
					</span>
				)}
			</span>
		</button>
	);
}
