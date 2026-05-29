import { Icon } from '@iconify/react';

import { cn } from '@components/utils';

interface StepItemProps {
	short: string; // "01"
	label: string;
	icon: string; // iconify name
	state: 'done' | 'current' | 'pending';
	estimatedTime?: string | undefined;
	isLast: boolean;
	onClick?: (() => void) | undefined;
}

/**
 * Un paso del stepper vertical del rail izquierdo.
 *
 * Estados visuales:
 *   - done:    dot verde acento con check, label inkMute
 *   - current: dot tinta sólido con icono, label ink + tiempo estimado
 *   - pending: dot blanco con borde lineStrong, label inkSoft
 *
 * Conector vertical entre items (no en el último). Verde si el step
 * está done (representa progreso hacia el siguiente).
 */
export function StepItem({
	short,
	label,
	icon,
	state,
	estimatedTime,
	isLast,
	onClick,
}: StepItemProps) {
	const isCurrent = state === 'current';
	const isDone = state === 'done';
	const isClickable = !!onClick && isDone;

	return (
		<div className="relative flex items-start gap-3.5 pb-[18px]">
			{/* Conector vertical hacia el siguiente step */}
			{!isLast && (
				<div
					className={cn(
						'absolute top-9 left-[17px] h-[calc(100%-24px)] w-[1.5px]',
						isDone
							? 'bg-[var(--cf-accent)]'
							: 'bg-[var(--cf-line)]',
					)}
					aria-hidden="true"
				/>
			)}

			<button
				type="button"
				disabled={!isClickable}
				onClick={onClick}
				aria-current={isCurrent ? 'step' : undefined}
				className={cn(
					'relative z-10 grid h-9 w-9 shrink-0 place-items-center rounded-full border-[1.5px] transition-all',
					isCurrent &&
						'border-[var(--cf-ink)] bg-[var(--cf-ink)] text-[var(--cf-bg-card)]',
					isDone &&
						'border-[var(--cf-accent)] bg-[var(--cf-accent)] text-white',
					!isCurrent &&
						!isDone &&
						'border-[var(--cf-line-strong)] bg-[var(--cf-bg-card)] text-[var(--cf-ink-soft)]',
					isClickable && 'cursor-pointer hover:opacity-90',
					!isClickable && 'cursor-default',
				)}
			>
				<Icon
					icon={isDone ? 'ri:check-line' : icon}
					className="h-4 w-4"
				/>
			</button>

			<div className="min-w-0 flex-1 pt-1">
				<div
					className="cf-mono text-[10px] tracking-[0.12em] uppercase"
					style={{ color: 'var(--cf-ink-soft)' }}
				>
					PASO {short}
				</div>
				<div
					className="text-[14px] font-semibold tracking-[-0.005em]"
					style={{
						color: isCurrent || isDone ? 'var(--cf-ink)' : 'var(--cf-ink-soft)',
					}}
				>
					{label}
				</div>
				{isCurrent && estimatedTime && (
					<div
						className="mt-0.5 flex items-center gap-1 text-[12px]"
						style={{ color: 'var(--cf-ink-soft)' }}
					>
						<Icon icon="ri:time-line" className="h-3 w-3" />
						{estimatedTime}
					</div>
				)}
			</div>
		</div>
	);
}
