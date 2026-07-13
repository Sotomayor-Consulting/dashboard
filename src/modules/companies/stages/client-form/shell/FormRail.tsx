import { Icon } from '@iconify/react';

import LogoLight from '../../../../../icons/logo-sotomayor-consulting.svg';
import LogoDark from '../../../../../icons/logo-sotomayor-consulting-black.svg';

import { STEPS } from '../data/steps';
import type { StepId } from '../types';
import { SideSummary, type SideSummaryItem } from './SideSummary';
import { StepItem } from './StepItem';

interface Props {
	currentStep: StepId;
	summary?: SideSummaryItem[] | undefined;
	onStepClick?: ((step: StepId) => void) | undefined;
}

/**
 * Rail izquierdo (300px fijo) del FormShell.
 *
 * Estructura vertical:
 *   1. Logo Sotomayor
 *   2. Bloque "Formulario de incorporación · LLC · Estados Unidos"
 *   3. Stepper vertical (5 pasos con conector entre dots)
 *   4. SideSummary (resumen acumulado de pasos previos) — solo desde paso 2
 *   5. Footer: ayuda + conexión segura (push hacia abajo con mt-auto)
 *
 * Click en step done permite regresar (vía onStepClick); steps pending
 * no son clickeables. Esto se mapea al `goTo` del wizard padre.
 */
export function FormRail({ currentStep, summary = [], onStepClick }: Props) {
	return (
		<aside
			className="hidden flex-col overflow-hidden border-r px-6 py-7 lg:flex"
			style={{
				background: 'var(--cf-bg-rail)',
				borderColor: 'var(--cf-line)',
			}}
		>
			{/* Logo */}
			<div className="h-12">
				<img
					src={LogoLight.src}
					alt="Sotomayor Consulting"
					className="block h-full w-auto object-contain object-left dark:hidden"
				/>
				<img
					src={LogoDark.src}
					alt="Sotomayor Consulting"
					className="hidden h-full w-auto object-contain object-left dark:block"
				/>
			</div>

			{/* Título del formulario */}
			<div className="mt-8 mb-4">
				<div
					className="cf-mono mb-1 text-[10px] tracking-[0.14em] uppercase"
					style={{ color: 'var(--cf-ink-soft)' }}
				>
					Formulario de incorporación
				</div>
				<div
					className="text-[15px] font-semibold tracking-[-0.01em]"
					style={{ color: 'var(--cf-ink)' }}
				>
					LLC · Estados Unidos
				</div>
			</div>

			{/* Stepper vertical */}
			<ol className="mt-1 list-none p-0">
				{STEPS.map((s, idx) => {
					const state =
						idx + 1 < currentStep
							? 'done'
							: idx + 1 === currentStep
								? 'current'
								: 'pending';
					return (
						<li key={s.id}>
							<StepItem
								short={String(s.id).padStart(2, '0')}
								label={s.title}
								icon={s.icon}
								state={state}
								estimatedTime={s.estimatedTime}
								isLast={idx === STEPS.length - 1}
								onClick={
									state === 'done' && onStepClick
										? () => onStepClick(s.id as StepId)
										: undefined
								}
							/>
						</li>
					);
				})}
			</ol>

			{/* Side summary */}
			<SideSummary items={summary} />

			{/* Footer del rail (siempre abajo) */}
			<div
				className="mt-auto border-t pt-[18px]"
				style={{ borderColor: 'var(--cf-line)' }}
			>
				<div
					className="flex items-center gap-2 text-[12px]"
					style={{ color: 'var(--cf-ink-mute)' }}
				>
					<Icon
						icon="ri:question-line"
						className="h-3.5 w-3.5"
						style={{ color: 'var(--cf-ink-soft)' }}
					/>
					¿Necesitas ayuda?{' '}
					<a
						href="mailto:info@sotomayorconsulting.com"
						className="border-b font-medium"
						style={{
							color: 'var(--cf-ink)',
							borderColor: 'var(--cf-line-strong)',
						}}
					>
						Contáctanos
					</a>
				</div>
				<div
					className="mt-2 flex items-center gap-2 text-[11px]"
					style={{ color: 'var(--cf-ink-soft)' }}
				>
					<Icon icon="ri:lock-line" className="h-3 w-3" />
					Conexión segura · datos cifrados
				</div>
			</div>
		</aside>
	);
}
