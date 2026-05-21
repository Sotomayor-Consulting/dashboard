import { Icon } from '@iconify/react';

import { Button } from '@components/ui/Button';

import { STEPS } from '../data/steps';
import type { StepId } from '../types';

interface Props {
	currentStep: StepId;
	canGoNext: boolean;
	canSubmit: boolean;
	isSubmitting: boolean;
	onPrev: () => void;
	onNext: () => void;
	onSubmit: () => void;
}

export function WizardNavigation({
	currentStep,
	canGoNext,
	canSubmit,
	isSubmitting,
	onPrev,
	onNext,
	onSubmit,
}: Props) {
	const isLast = currentStep === STEPS.length;
	return (
		<div className="bg-muted/30 border-border flex items-center justify-between gap-4 border-t px-6 py-5 md:px-8">
			<Button
				type="button"
				variant="outline"
				onClick={onPrev}
				disabled={currentStep === 1}
				className="gap-2"
			>
				<Icon icon="ri:arrow-left-s-line" className="h-4 w-4" />
				<span className="hidden sm:inline">Anterior</span>
			</Button>

			<span className="text-muted-foreground text-xs tracking-widest">
				{String(currentStep).padStart(2, '0')} /{' '}
				{String(STEPS.length).padStart(2, '0')}
			</span>

			{!isLast ? (
				<Button
					type="button"
					onClick={onNext}
					disabled={!canGoNext}
					className="bg-accent hover:bg-accent/90 text-accent-foreground gap-2"
				>
					<span className="hidden sm:inline">Siguiente</span>
					<Icon icon="ri:arrow-right-s-line" className="h-4 w-4" />
				</Button>
			) : (
				<Button
					type="button"
					onClick={onSubmit}
					disabled={!canSubmit || isSubmitting}
					className="bg-accent hover:bg-accent/90 text-accent-foreground gap-2"
				>
					{isSubmitting ? 'Enviando…' : 'Enviar solicitud'}
					<Icon icon="ri:check-line" className="h-4 w-4" />
				</Button>
			)}
		</div>
	);
}
