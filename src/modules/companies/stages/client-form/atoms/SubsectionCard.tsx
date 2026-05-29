import { Icon } from '@iconify/react';
import { AnimatePresence, motion } from 'framer-motion';
import type { ReactNode } from 'react';

interface Props {
	/** Letra A/B/C/D que aparece en el dot cuando NO está completa. */
	kicker: string;
	title: string;
	/** Campos completados (numerador). */
	completed: number;
	/** Total de campos relevantes (denominador). */
	total: number;
	/** Si está expandida (controlada por el padre). */
	open: boolean;
	onToggle: () => void;
	children: ReactNode;
}

/**
 * Card colapsable con indicador de progreso.
 *
 * Header (siempre visible):
 *   - Dot 26px: verde con check si `completed >= total`; gris con letra si no.
 *   - Título 14/600 + meta mono "X / Y campos completados".
 *   - Chevron up/down según `open`.
 *
 * Body (solo si `open`): padding 20×22.
 *
 * Es accesible: header es un `<button>` con `aria-expanded` y `aria-controls`.
 */
export function SubsectionCard({
	kicker,
	title,
	completed,
	total,
	open,
	onToggle,
	children,
}: Props) {
	const isComplete = completed >= total && total > 0;
	const bodyId = `subsection-${kicker.toLowerCase()}-body`;

	return (
		<div
			className="overflow-hidden rounded-[14px] border"
			style={{
				borderColor: 'var(--cf-line)',
				background: 'var(--cf-bg-card)',
			}}
		>
			<button
				type="button"
				onClick={onToggle}
				aria-expanded={open}
				aria-controls={bodyId}
				className="flex w-full items-center justify-between p-[14px_18px] text-left transition-colors"
				style={{
					background: open ? 'var(--cf-bg-rail)' : 'var(--cf-bg-card)',
					borderBottom: open ? '1px solid var(--cf-line-soft)' : 'none',
				}}
			>
				<div className="flex min-w-0 items-center gap-3">
					<div
						className="grid h-[26px] w-[26px] shrink-0 place-items-center rounded-full border-[1.5px]"
						style={{
							background: isComplete ? 'var(--cf-accent)' : 'var(--cf-bg-subtle)',
							borderColor: isComplete
								? 'var(--cf-accent)'
								: 'var(--cf-line)',
							color: isComplete ? '#fff' : 'var(--cf-ink-mute)',
						}}
					>
						{isComplete ? (
							<Icon icon="ri:check-line" className="h-[13px] w-[13px]" />
						) : (
							<span className="cf-mono text-[11px]">{kicker}</span>
						)}
					</div>
					<div className="min-w-0">
						<div
							className="text-[14px] font-semibold tracking-[-0.005em]"
							style={{ color: 'var(--cf-ink)' }}
						>
							{title}
						</div>
						<div
							className="cf-mono mt-0.5 text-[11.5px]"
							style={{ color: 'var(--cf-ink-soft)' }}
						>
							{completed}{' '}
							<span style={{ color: 'var(--cf-ink-faint)' }}>/</span> {total}{' '}
							campos completados
						</div>
					</div>
				</div>
				<motion.span
					className="shrink-0"
					animate={{ rotate: open ? 180 : 0 }}
					transition={{ duration: 0.2, ease: 'easeInOut' }}
					style={{ display: 'inline-flex' }}
				>
					<Icon
						icon="ri:arrow-down-s-line"
						className="h-3.5 w-3.5"
						style={{ color: 'var(--cf-ink-soft)' }}
					/>
				</motion.span>
			</button>
			<AnimatePresence initial={false}>
				{open && (
					<motion.div
						key="body"
						id={bodyId}
						initial={{ height: 0, opacity: 0 }}
						animate={{ height: 'auto', opacity: 1 }}
						exit={{ height: 0, opacity: 0 }}
						transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
						className="overflow-hidden"
					>
						<div className="px-[22px] pt-5 pb-[22px]">{children}</div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}
