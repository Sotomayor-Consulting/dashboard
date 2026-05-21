import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FormProvider, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import '../icons'; // Registra el set `ri` de iconify offline (side-effect).

import { WizardHeader } from '../components/WizardHeader';
import { WizardNavigation } from '../components/WizardNavigation';
import { WizardProgress } from '../components/WizardProgress';
import { StepActivity } from '../components/steps/StepActivity';
import { StepConfirmation } from '../components/steps/StepConfirmation';
import { StepManager } from '../components/steps/StepManager';
import { StepMembers } from '../components/steps/StepMembers';
import { StepWelcome } from '../components/steps/StepWelcome';
import type { Activity } from '../data/activities';
import { createInitialFormData } from '../data/defaults';
import { useLocalStorageDraft } from '../hooks/use-local-storage-draft';
import { useStepNavigation } from '../hooks/use-step-navigation';
import {
	type ClientFormInput,
	clientFormSchema,
} from '../schemas/client-form.schema';
import { submitClientForm } from '../services/submit-client-form';
import type { ClientFormData } from '../types';

interface Props {
	activities: Activity[];
	empresaId: string;
}

export default function ClientFormWizard({ activities, empresaId }: Props) {
	const { loadDraft, saveDraft, clearDraft } = useLocalStorageDraft({
		key: `sotomayor:client-incorporation-form:draft:${empresaId}`,
	});

	// 3 generics:
	//   TFieldValues       = ClientFormData      (state mutable, permite null/incompleto)
	//   TContext           = unknown
	//   TTransformedValues = ClientFormInput     (output validado del schema, estricto)
	// Esto permite usar el resolver de zod con un schema más estricto que el state,
	// que es lo correcto: durante el wizard el form acepta nulls; al submit no.
	const methods = useForm<ClientFormData, unknown, ClientFormInput>({
		resolver: zodResolver(clientFormSchema),
		defaultValues: createInitialFormData(),
		mode: 'onSubmit',
	});

	const { control, handleSubmit, reset } = methods;

	// Cargar draft al montar (sólo cliente).
	const [hydrated, setHydrated] = useState(false);
	useEffect(() => {
		const draft = loadDraft();
		if (draft) reset(draft);
		setHydrated(true);
	}, [loadDraft, reset]);

	// Autosave con debounce — observa todo el form.
	const watched = useWatch<ClientFormData>({ control }) as ClientFormData;
	useEffect(() => {
		if (!hydrated) return;
		saveDraft(watched);
	}, [watched, hydrated, saveDraft]);

	// Navegación de steps.
	const { currentStep, goNext, goPrev, goTo } = useStepNavigation(1);

	// Estado del submit.
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [submitError, setSubmitError] = useState<string | null>(null);

	// Bloqueos por step (igual que el original: en step 3 se exige % === 100).
	const totalPercentage = useMemo(
		() =>
			(watched?.miembros ?? []).reduce(
				(sum, m) => sum + (m?.porcentaje || 0),
				0,
			),
		[watched],
	);
	const canGoNext = currentStep === 3 ? totalPercentage === 100 : true;
	const canSubmit = !!watched?.aceptaTerminos;

	const onSubmit = useCallback(
		async (data: ClientFormInput) => {
			setSubmitError(null);
			setIsSubmitting(true);
			try {
				const result = await submitClientForm(data, { empresaId });
				if (!result.ok) {
					setSubmitError(result.message ?? 'No se pudo enviar el formulario.');
					return;
				}
				clearDraft();
				if (result.redirectTo) {
					window.location.href = result.redirectTo;
				}
			} catch (e) {
				console.error(e);
				setSubmitError('Ocurrió un error al enviar el formulario.');
			} finally {
				setIsSubmitting(false);
			}
		},
		[empresaId, clearDraft],
	);

	const triggerSubmit = useCallback(() => {
		void handleSubmit(onSubmit, (errors) => {
			console.warn('Errores de validación', errors);
			setSubmitError(
				'Hay datos pendientes o inválidos. Revisa los pasos marcados.',
			);
		})();
	}, [handleSubmit, onSubmit]);

	return (
		<FormProvider {...methods}>
			<form
				onSubmit={(e) => e.preventDefault()}
				className="bg-background min-h-screen"
			>
				<WizardHeader />

				<main className="mx-auto max-w-4xl px-4 py-8">
					<WizardProgress currentStep={currentStep} onStepClick={goTo} />

					<div className="bg-card border-border overflow-hidden rounded-2xl border shadow-sm">
						<AnimatePresence mode="wait">
							<motion.div
								key={currentStep}
								initial={{ opacity: 0, y: 10 }}
								animate={{ opacity: 1, y: 0 }}
								exit={{ opacity: 0, y: -10 }}
								transition={{ duration: 0.25 }}
								className="p-6 md:p-8"
							>
								{currentStep === 1 && <StepWelcome />}
								{currentStep === 2 && <StepActivity activities={activities} />}
								{currentStep === 3 && <StepMembers />}
								{currentStep === 4 && <StepManager />}
								{currentStep === 5 && (
									<StepConfirmation activities={activities} />
								)}
							</motion.div>
						</AnimatePresence>

						<WizardNavigation
							currentStep={currentStep}
							canGoNext={canGoNext}
							canSubmit={canSubmit}
							isSubmitting={isSubmitting}
							onPrev={goPrev}
							onNext={goNext}
							onSubmit={triggerSubmit}
						/>
					</div>

					{submitError && (
						<div className="bg-destructive/10 border-destructive/30 text-destructive mt-4 rounded-lg border p-3 text-sm">
							{submitError}
						</div>
					)}

					<div className="mt-6 text-center">
						<p className="text-muted-foreground text-sm">
							¿Necesitas ayuda?{' '}
							<a
								href="mailto:info@sotomayorconsulting.com"
								className="text-accent font-medium text-black underline-offset-4 hover:underline dark:text-white"
							>
								Contáctanos
							</a>
						</p>
					</div>
				</main>
			</form>
		</FormProvider>
	);
}
