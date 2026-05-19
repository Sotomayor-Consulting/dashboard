import { Icon } from '@iconify/react';

import { cn } from '@components/utils';

import { STEPS } from '../data/steps';
import type { StepId } from '../types';

interface Props {
	currentStep: StepId;
	onStepClick: (step: StepId) => void;
}

export function WizardProgress({ currentStep, onStepClick }: Props) {
	return (
		<nav className="mb-8" aria-label="Progress">
			<ol className="relative flex items-center justify-between">
				<div
					className="bg-border absolute top-5 right-[10%] left-[10%] hidden h-0.5 md:block"
					aria-hidden="true"
				/>
				<div
					className="bg-accent absolute top-5 left-[10%] hidden h-0.5 transition-all duration-500 md:block"
					style={{
						width: `${((currentStep - 1) / (STEPS.length - 1)) * 80}%`,
					}}
					aria-hidden="true"
				/>
				{STEPS.map((step) => {
					const isCompleted = currentStep > step.id;
					const isCurrent = currentStep === step.id;
					return (
						<li
							key={step.id}
							className="relative z-10 flex flex-1 flex-col items-center"
						>
							<button
								type="button"
								onClick={() => step.id < currentStep && onStepClick(step.id)}
								disabled={step.id > currentStep}
								className={cn(
									'flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-300',
									isCompleted
										? 'bg-accent border-accent cursor-pointer hover:bg-black/20'
										: isCurrent
											? 'bg-card border-accent shadow-md'
											: 'bg-card border-border cursor-not-allowed',
								)}
								aria-current={isCurrent ? 'step' : undefined}
							>
								{isCompleted ? (
									<Icon
										icon="ri:check-line"
										className="text-accent-foreground h-5 w-5"
									/>
								) : (
									<Icon
										icon={step.icon}
										className={cn(
											'h-5 w-5',
											isCurrent ? 'text-accent' : 'text-muted-foreground',
										)}
									/>
								)}
							</button>
							<span
								className={cn(
									'mt-2 hidden text-center text-xs font-medium md:block',
									isCompleted || isCurrent
										? 'text-foreground'
										: 'text-muted-foreground',
								)}
							>
								{step.title}
							</span>
						</li>
					);
				})}
			</ol>
			<div className="mt-4 text-center md:hidden">
				<span className="text-foreground text-sm font-medium">
					Paso {currentStep} de {STEPS.length}: {STEPS[currentStep - 1]?.title}
				</span>
			</div>
		</nav>
	);
}
