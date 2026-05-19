import { useCallback, useState } from 'react';

import { STEPS } from '../data/steps';
import type { StepId } from '../types';

export interface UseStepNavigationApi {
	currentStep: StepId;
	goNext: () => void;
	goPrev: () => void;
	goTo: (step: StepId) => void;
	isFirst: boolean;
	isLast: boolean;
	total: number;
}

const MAX_STEP = STEPS.length as StepId;

const scrollToTop = () => {
	if (typeof window !== 'undefined') {
		window.scrollTo({ top: 0, behavior: 'smooth' });
	}
};

export function useStepNavigation(
	initial: StepId = 1,
): UseStepNavigationApi {
	const [currentStep, setCurrentStep] = useState<StepId>(initial);

	const goNext = useCallback(() => {
		setCurrentStep((prev) => {
			const next = Math.min(prev + 1, MAX_STEP) as StepId;
			if (next !== prev) scrollToTop();
			return next;
		});
	}, []);

	const goPrev = useCallback(() => {
		setCurrentStep((prev) => {
			const next = Math.max(prev - 1, 1) as StepId;
			if (next !== prev) scrollToTop();
			return next;
		});
	}, []);

	const goTo = useCallback((step: StepId) => {
		setCurrentStep((prev) => {
			if (step === prev) return prev;
			if (step < 1 || step > MAX_STEP) return prev;
			scrollToTop();
			return step;
		});
	}, []);

	return {
		currentStep,
		goNext,
		goPrev,
		goTo,
		isFirst: currentStep === 1,
		isLast: currentStep === MAX_STEP,
		total: STEPS.length,
	};
}
