import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FormProvider, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import '../icons'; // Registra el set `ri` de iconify offline (side-effect).

import { StepActivity } from '../components/steps/StepActivity';
import { StepConfirmation } from '../components/steps/StepConfirmation';
import { StepManager } from '../components/steps/StepManager';
import { StepMembers } from '../components/steps/StepMembers';
import { StepWelcome } from '../components/steps/StepWelcome';
import type { Activity } from '../data/activities';
import { createInitialFormData } from '../data/defaults';
import { STEPS } from '../data/steps';
import { useLocalStorageDraft } from '../hooks/use-local-storage-draft';
import { useStepNavigation } from '../hooks/use-step-navigation';
import {
	type ClientFormInput,
	clientFormSchema,
} from '../schemas/client-form.schema';
import { getIncorporationRules } from '../data/incorporation-rules';
import { IncorporationRulesProvider } from '../data/incorporation-rules-context';
import type {
	EstadoOption,
	IncorporationIdentity,
} from '../services/get-client-form-data';
import { submitClientForm } from '../services/submit-client-form';
import { FormShell, type SideSummaryItem } from '../shell';
import type { ClientFormData, StepId } from '../types';
import { MembersAllocationBar } from '../components/steps/StepMembers/MembersAllocationBar';

interface Props {
	activities: Activity[];
	empresaId: string;
	/** Identidad pre-cargada (3 nombres + estado) de la solicitud. */
	identity: IncorporationIdentity;
	/** Lista de estados disponibles para la Identity Card. */
	estados: EstadoOption[];
}

/** Mapea un campo del form a su paso (para navegar al error en el submit). */
const FIELD_STEP: Record<string, StepId> = {
	ingresosEEUU: 2,
	actividad: 2,
	descripcionActividad: 2,
	codigoActividad: 2,
	formaAdministracion: 2,
	formaTributacion: 2,
	direccionOperativaEEUU: 2,
	direccion: 2,
	condado: 2,
	ciudad: 2,
	estado: 2,
	codigoPostal: 2,
	pais: 2,
	direccionEmpresa: 2,
	facturaServicioBasico: 2,
	miembros: 3,
	informacionMiembrosPublica: 3,
	managerSCI: 4,
	managerEsMiembro: 4,
	seleccionManagers: 4,
	managers: 4,
	informacionManagersPublica: 4,
	responsableIRS: 4,
	firma: 5,
	aceptaTerminos: 5,
};

/** Devuelve el menor paso que contiene algún campo con error. */
function firstErrorStep(errorKeys: string[]): StepId | null {
	const steps = errorKeys
		.map((k) => FIELD_STEP[k])
		.filter((s): s is StepId => s !== undefined);
	if (steps.length === 0) return null;
	return steps.sort((a, b) => a - b)[0] ?? null;
}

export default function ClientFormWizard({
	activities,
	empresaId,
	identity,
	estados,
}: Props) {
	// El estado de incorporación es editable desde la Identity Card (pantalla 1),
	// así que lo mantenemos en estado local para re-evaluar las reglas en vivo.
	const [estadoIncorporacion, setEstadoIncorporacion] = useState<string | null>(
		identity.estadoIncorporacion,
	);
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

	// Reglas de negocio según el estado de incorporación Y la forma de
	// administración (la divulgación pública depende de ambos).
	const rules = useMemo(
		() =>
			getIncorporationRules(estadoIncorporacion, watched?.formaAdministracion),
		[estadoIncorporacion, watched?.formaAdministracion],
	);

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
			// Mapea el primer campo con error a su paso y navega hasta él.
			const errorStep = firstErrorStep(Object.keys(errors));
			if (errorStep) {
				goTo(errorStep);
				setSubmitError(
					`Faltan datos obligatorios en el paso ${String(errorStep).padStart(2, '0')}. Revisa los campos marcados en rojo.`,
				);
			} else {
				setSubmitError(
					'Hay datos pendientes o inválidos. Revisa los pasos del formulario.',
				);
			}
		})();
	}, [handleSubmit, onSubmit, goTo]);

	// Metadata del paso actual para el shell
	const currentMeta = STEPS.find((s) => s.id === currentStep);
	const stepEyebrow = (() => {
		if (currentStep === 1) return 'Empecemos';
		return currentMeta
			? `PASO ${String(currentMeta.id).padStart(2, '0')} · ${currentMeta.title.toUpperCase()}`
			: undefined;
	})();
	const stepTitle = (() => {
		if (currentStep === 1)
			return 'Está a un paso de incorporar su empresa en EE. UU.';
		if (currentStep === 2) return 'Información general';
		if (currentStep === 3) return 'Miembros de la LLC';
		if (currentStep === 4) return 'Designación de manager';
		return 'Confirmación y firma';
	})();

	// ── Resumen acumulado en el rail (solo desde paso 2) ──────────
	const summary: SideSummaryItem[] = useMemo(() => {
		if (currentStep < 2) return [];
		const items: SideSummaryItem[] = [];
		items.push({ label: 'Tipo de entidad', value: 'LLC · Estados Unidos' });
		if (currentStep >= 3 && watched?.formaAdministracion) {
			items.push({
				label: 'Operación',
				value:
					watched.formaAdministracion === 'manager-managed'
						? 'Manager-Managed'
						: 'Member-Managed',
			});
		}
		if (currentStep >= 4 && watched?.formaTributacion) {
			items.push({
				label: 'Tributación',
				value:
					watched.formaTributacion === 'pass-through'
						? 'Pass-Through'
						: watched.formaTributacion === 'corporation'
							? 'Corporación'
							: '—',
			});
		}
		if (currentStep >= 4 && (watched?.miembros?.length ?? 0) > 0) {
			items.push({
				label: 'Socios',
				value: `${watched.miembros.length} socio${watched.miembros.length === 1 ? '' : 's'} · ${totalPercentage}%`,
			});
		}
		if (currentStep === 5) {
			items.push({ label: 'Estado', value: 'Listo para enviar' });
		}
		return items;
	}, [currentStep, watched, totalPercentage]);

	const isLastStep = currentStep === 5;

	// Footer especial para Step 3 (Miembros) con barra de % asignado.
	const membersFooter =
		currentStep === 3 ? (
			<div
				className="sticky bottom-0 flex items-center justify-between gap-3 border-t px-5 py-3 sm:px-8 lg:px-10 lg:py-[18px]"
				style={{
					background: 'var(--cf-bg-card)',
					borderColor: 'var(--cf-line)',
				}}
			>
				<button
					type="button"
					onClick={goPrev}
					className="inline-flex h-10 items-center gap-2 rounded-lg border px-4 text-[14px] font-medium transition-all hover:opacity-90"
					style={{
						background: 'var(--cf-bg-card)',
						borderColor: 'var(--cf-line)',
						color: 'var(--cf-ink)',
					}}
				>
					<svg
						width="14"
						height="14"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="1.5"
						strokeLinecap="round"
						strokeLinejoin="round"
					>
						<path d="M19 12H5M12 19l-7-7 7-7" />
					</svg>
					Anterior
				</button>

				<div className="hidden flex-1 justify-center md:flex">
					<MembersAllocationBar total={totalPercentage} />
				</div>

				<div className="flex items-center gap-3.5">
					<span
						className="cf-mono text-[12px]"
						style={{ color: 'var(--cf-ink-soft)' }}
					>
						03 <span style={{ color: 'var(--cf-ink-faint)' }}>/</span> 05
					</span>
					<button
						type="button"
						onClick={goNext}
						disabled={!canGoNext}
						className="inline-flex h-10 items-center gap-2 rounded-lg px-[18px] text-[14px] font-medium transition-all"
						style={{
							background: canGoNext ? 'var(--cf-ink)' : 'var(--cf-bg-subtle)',
							color: canGoNext ? 'var(--cf-bg-card)' : 'var(--cf-ink-faint)',
							cursor: canGoNext ? 'pointer' : 'default',
						}}
					>
						Siguiente
						<svg
							width="14"
							height="14"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="1.5"
							strokeLinecap="round"
							strokeLinejoin="round"
						>
							<path d="M5 12h14M13 5l7 7-7 7" />
						</svg>
					</button>
				</div>
			</div>
		) : undefined;

	return (
		<FormProvider {...methods}>
			<IncorporationRulesProvider value={rules}>
				<form onSubmit={(e) => e.preventDefault()}>
					<FormShell
						currentStep={currentStep}
						eyebrow={stepEyebrow}
						title={stepTitle}
						summary={summary}
						footer={membersFooter}
						onPrev={goPrev}
						onNext={isLastStep ? triggerSubmit : goNext}
						onStepClick={goTo}
						canGoNext={canGoNext}
						canSubmit={canSubmit}
						isSubmitting={isSubmitting}
						hidePrev={currentStep === 1}
						nextLabel={currentStep === 1 ? 'Comenzar formulario' : undefined}
					>
						<AnimatePresence mode="wait">
							<motion.div
								key={currentStep}
								initial={{ opacity: 0, y: 10 }}
								animate={{ opacity: 1, y: 0 }}
								exit={{ opacity: 0, y: -10 }}
								transition={{ duration: 0.25 }}
							>
								{currentStep === 1 && (
									<StepWelcome
										empresaId={empresaId}
										nameOptions={identity.nameOptions}
										estado={estadoIncorporacion}
										estados={estados}
										onEstadoChange={setEstadoIncorporacion}
									/>
								)}
								{currentStep === 2 && <StepActivity activities={activities} />}
								{currentStep === 3 && <StepMembers />}
								{currentStep === 4 && <StepManager />}
								{currentStep === 5 && (
									<StepConfirmation activities={activities} onEditStep={goTo} />
								)}
							</motion.div>
						</AnimatePresence>

						{submitError && (
							<div
								className="mt-4 rounded-lg border p-3 text-sm"
								style={{
									background: 'var(--cf-danger-soft)',
									borderColor: 'var(--cf-danger-border)',
									color: 'var(--cf-danger)',
								}}
							>
								{submitError}
							</div>
						)}
					</FormShell>
				</form>
			</IncorporationRulesProvider>
		</FormProvider>
	);
}
