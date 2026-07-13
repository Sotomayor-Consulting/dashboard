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
					className="bg-border absolute top-5 right-[10%] left-[10%] z-0 hidden h-0.5 md:block"
					aria-hidden="true"
				/>
				<div
					className="absolute top-5 left-[10%] z-0 hidden h-0.5 bg-green-500 transition-all duration-500 md:block"
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
										? 'cursor-pointer border-green-500 bg-green-100 hover:bg-green-200 dark:bg-green-950 dark:hover:bg-green-900'
										: isCurrent
											? 'bg-card border-gray-900 shadow-md dark:border-gray-100'
											: 'bg-card border-border opacity cursor-not-allowed',
								)}
								aria-current={isCurrent ? 'step' : undefined}
							>
								{isCompleted ? (
									<Icon
										icon="ri:check-line"
										className="h-5 w-5 text-green-500"
									/>
								) : (
									<Icon
										icon={step.icon}
										className={cn(
											'h-5 w-5',
											isCurrent
												? 'text-black dark:text-white'
												: 'text-gray-500',
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
