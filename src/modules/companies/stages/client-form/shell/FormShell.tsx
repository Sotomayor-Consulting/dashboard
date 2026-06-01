import type { ReactNode } from 'react';

import type { StepId } from '../types';
import { FormFooter } from './FormFooter';
import { FormRail } from './FormRail';
import type { SideSummaryItem } from './SideSummary';
import { ThemeSwitcher } from './ThemeSwitcher';

interface Props {
	/** Paso actual (1..5). */
	currentStep: StepId;
	/** Total de pasos. Por defecto 5. */
	totalSteps?: number | undefined;
	/** Kicker mono encima del título (ej. "PASO 02 · ACTIVIDAD"). */
	eyebrow?: string | undefined;
	/** Título grande del header sticky. */
	title: string;
	/** Items de resumen acumulado para el rail (mostrados a partir del paso 2). */
	summary?: SideSummaryItem[] | undefined;
	/** Contenido del paso. */
	children: ReactNode;
	/** Footer custom — si no se pasa se usa el FormFooter default. */
	footer?: ReactNode;
	/** Navegación. */
	onPrev: () => void;
	onNext: () => void;
	onStepClick?: ((step: StepId) => void) | undefined;
	canGoNext?: boolean | undefined;
	canSubmit?: boolean | undefined;
	isSubmitting?: boolean | undefined;
	/** Label custom para el botón "Siguiente" (ej. "Comenzar formulario" en paso 1). */
	nextLabel?: string | undefined;
	/** Texto/meta opcional a la izquierda del footer (reemplaza el botón Anterior). */
	footerLeftMeta?: React.ReactNode;
	/** Si true, oculta el botón Anterior (paso 1 generalmente). */
	hidePrev?: boolean | undefined;
}

/**
 * Layout global del formulario de incorporación LLC (rediseño).
 *
 * 2 paneles:
 *   - Rail izquierdo (300px fijo): branding + stepper vertical + summary + help
 *   - Panel principal (flex): header sticky + body scrolleable + footer sticky
 *
 * El shell mantiene `bgPage` de fondo (warm neutral) y el panel principal
 * `bgCard` (blanco). Esto separa visualmente el contenido del entorno.
 *
 * IMPORTANTE: este shell solo es UI. NO toca lógica del wizard — recibe
 * todos los callbacks y estado del componente padre (`ClientFormWizard`).
 */
export function FormShell({
	currentStep,
	totalSteps = 5,
	eyebrow,
	title,
	summary,
	children,
	footer,
	onPrev,
	onNext,
	onStepClick,
	canGoNext,
	canSubmit,
	isSubmitting,
	nextLabel,
	footerLeftMeta,
	hidePrev,
}: Props) {
	const isLastStep = currentStep === totalSteps;

	return (
		<div
			className="client-form-shell fixed inset-0 grid grid-cols-1 overflow-hidden lg:grid-cols-[300px_1fr]"
			style={{
				background: 'var(--cf-bg-page)',
			}}
		>
			{/* Rail completo solo en desktop */}
			<FormRail
				currentStep={currentStep}
				summary={summary}
				onStepClick={onStepClick}
			/>

			<main className="flex min-w-0 flex-col overflow-hidden">
				{/* Header sticky */}
				<header
					className="flex items-start justify-between gap-3 border-b px-5 pt-5 pb-4 sm:px-8 lg:px-10 lg:pt-6 lg:pb-[22px]"
					style={{
						background: 'var(--cf-bg-card)',
						borderColor: 'var(--cf-line)',
					}}
				>
					<div className="min-w-0">
						{/* Indicador de paso compacto — solo móvil/tablet */}
						<div
							className="cf-mono mb-1 text-[10px] tracking-[0.14em] uppercase lg:hidden"
							style={{ color: 'var(--cf-ink-soft)' }}
						>
							Paso {String(currentStep).padStart(2, '0')} de{' '}
							{String(totalSteps).padStart(2, '0')}
						</div>
						{eyebrow && (
							<div
								className="cf-mono mb-1.5 hidden text-[10px] tracking-[0.14em] uppercase lg:block"
								style={{ color: 'var(--cf-ink-soft)' }}
							>
								{eyebrow}
							</div>
						)}
						<h1
							className="text-[18px] font-semibold tracking-[-0.018em] sm:text-[20px] lg:text-[22px]"
							style={{ color: 'var(--cf-ink)' }}
						>
							{title}
						</h1>
					</div>
					<ThemeSwitcher />
				</header>

				{/* Body scrolleable */}
				<div
					className="cf-scroll flex-1 overflow-auto"
					style={{ background: 'var(--cf-bg-card)' }}
				>
					<div className="mx-auto max-w-[880px] px-5 pt-6 pb-10 sm:px-8 lg:px-10 lg:pt-8">
						{children}
					</div>
				</div>

				{/* Footer (custom o default) */}
				{footer ?? (
					<FormFooter
						currentStep={currentStep}
						totalSteps={totalSteps}
						onPrev={onPrev}
						onNext={onNext}
						isLastStep={isLastStep}
						isSubmitting={isSubmitting}
						canGoNext={canGoNext}
						canSubmit={canSubmit}
						nextLabel={nextLabel}
						hidePrev={hidePrev}
						leftMeta={footerLeftMeta}
					/>
				)}
			</main>
		</div>
	);
}
