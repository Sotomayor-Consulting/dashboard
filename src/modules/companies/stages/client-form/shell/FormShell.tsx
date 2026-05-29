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
			className="client-form-shell fixed inset-0 grid overflow-hidden"
			style={{
				gridTemplateColumns: '300px 1fr',
				background: 'var(--cf-bg-page)',
			}}
		>
			<FormRail
				currentStep={currentStep}
				summary={summary}
				onStepClick={onStepClick}
			/>

			<main className="flex min-w-0 flex-col overflow-hidden">
				{/* Header sticky */}
				<header
					className="flex items-start justify-between border-b px-10 pt-6 pb-[22px]"
					style={{
						background: 'var(--cf-bg-card)',
						borderColor: 'var(--cf-line)',
					}}
				>
					<div>
						{eyebrow && (
							<div
								className="cf-mono mb-1.5 text-[10px] tracking-[0.14em] uppercase"
								style={{ color: 'var(--cf-ink-soft)' }}
							>
								{eyebrow}
							</div>
						)}
						<h1
							className="text-[22px] font-semibold tracking-[-0.018em]"
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
					<div className="mx-auto max-w-[880px] px-10 pt-8 pb-10">
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
