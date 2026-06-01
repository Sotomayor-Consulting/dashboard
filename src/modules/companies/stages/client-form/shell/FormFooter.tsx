import { Icon } from '@iconify/react';

import { cn } from '@components/utils';

interface Props {
	currentStep: number; // 1-indexed
	totalSteps: number;
	onPrev: () => void;
	onNext: () => void;
	isLastStep: boolean;
	isSubmitting?: boolean | undefined;
	canGoNext?: boolean | undefined;
	canSubmit?: boolean | undefined;
	/** Texto custom para el botón siguiente (override del default "Siguiente"). */
	nextLabel?: string | undefined;
	/** Si true, esconde el botón Anterior (paso 1). */
	hidePrev?: boolean | undefined;
	/** Texto opcional a la izquierda (en lugar del botón Anterior). */
	leftMeta?: React.ReactNode;
}

/**
 * Footer sticky del panel principal.
 * Izquierda: botón "Anterior" o texto custom (meta).
 * Centro: contador "01 / 05" (mono).
 * Derecha: botón primario "Siguiente" o "Enviar solicitud" (verde acento en último paso).
 */
export function FormFooter({
	currentStep,
	totalSteps,
	onPrev,
	onNext,
	isLastStep,
	isSubmitting,
	canGoNext = true,
	canSubmit = true,
	nextLabel,
	hidePrev,
	leftMeta,
}: Props) {
	const nextDisabled = isLastStep
		? !canSubmit || isSubmitting
		: !canGoNext;

	const showCheckIcon = isLastStep;
	const finalLabel = nextLabel
		? nextLabel
		: isLastStep
			? isSubmitting
				? 'Enviando…'
				: 'Enviar solicitud'
			: 'Siguiente';

	return (
		<div
			className="sticky bottom-0 flex items-center justify-between border-t px-5 py-4 sm:px-8 lg:px-10 lg:py-5"
			style={{
				background: 'var(--cf-bg-card)',
				borderColor: 'var(--cf-line)',
			}}
		>
			<div>
				{hidePrev ? (
					leftMeta
				) : (
					<button
						type="button"
						onClick={onPrev}
						disabled={currentStep <= 1}
						className={cn(
							'inline-flex h-10 items-center gap-2 rounded-lg border px-4 text-[14px] font-medium transition-all',
							currentStep <= 1
								? 'cursor-default'
								: 'cursor-pointer hover:opacity-90',
						)}
						style={{
							background:
								currentStep <= 1 ? 'var(--cf-bg-subtle)' : 'var(--cf-bg-card)',
							borderColor: 'var(--cf-line)',
							color:
								currentStep <= 1 ? 'var(--cf-ink-faint)' : 'var(--cf-ink)',
						}}
					>
						<Icon icon="ri:arrow-left-line" className="h-3.5 w-3.5" />
						Anterior
					</button>
				)}
			</div>

			<div className="flex items-center gap-3.5">
				<div
					className="cf-mono text-[12px]"
					style={{ color: 'var(--cf-ink-soft)' }}
				>
					{String(currentStep).padStart(2, '0')}{' '}
					<span style={{ color: 'var(--cf-ink-faint)' }}>/</span>{' '}
					{String(totalSteps).padStart(2, '0')}
				</div>
				<button
					type="button"
					onClick={onNext}
					disabled={nextDisabled}
					className={cn(
						'inline-flex h-10 items-center gap-2 rounded-lg border-0 px-[18px] text-[14px] font-medium tracking-[-0.005em] transition-all',
						nextDisabled
							? 'cursor-default'
							: 'cursor-pointer hover:opacity-90',
						isLastStep && !nextDisabled && '!h-[42px] !px-5',
					)}
					style={{
						background: nextDisabled
							? 'var(--cf-bg-subtle)'
							: isLastStep
								? 'var(--cf-accent)'
								: 'var(--cf-ink)',
						color: nextDisabled
							? 'var(--cf-ink-faint)'
							: isLastStep
								? '#fff'
								: 'var(--cf-bg-card)',
						boxShadow:
							isLastStep && !nextDisabled
								? 'var(--cf-shadow-cta)'
								: undefined,
					}}
				>
					{finalLabel}
					{showCheckIcon ? (
						<Icon icon="ri:check-line" className="h-3.5 w-3.5" />
					) : (
						<Icon icon="ri:arrow-right-line" className="h-3.5 w-3.5" />
					)}
				</button>
			</div>
		</div>
	);
}
