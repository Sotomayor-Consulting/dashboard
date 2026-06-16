import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { IncorporationProvider } from '../context/incorporation-context';
import type {
	EstadoOption,
	IncorporationIdentity,
} from '../services/get-client-form-data';
import { submitClientForm } from '../services/submit-client-form';
import { saveClientDraft } from '../services/save-client-draft';
import { parseIncorporationFormPayload } from '../payload';
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
	facturaServicioBasicoEEUU: 2,
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

/**
 * Inverso de FIELD_STEP: los campos que el `trigger` debe validar al pulsar
 * "Siguiente" en cada paso. Solo incluye los pasos con campos validables
 * (el paso 1 es la pantalla de bienvenida y no tiene validación).
 */
const STEP_FIELDS = (
	Object.entries(FIELD_STEP) as [keyof ClientFormData, StepId][]
).reduce(
	(acc, [field, step]) => {
		(acc[step] ??= []).push(field);
		return acc;
	},
	{} as Record<StepId, (keyof ClientFormData)[]>,
);

/**
 * Etiqueta de respaldo por campo, usada cuando el nodo de error no trae un
 * mensaje propio (raro: casi todos los refinements de zod ya tienen mensaje).
 */
const FIELD_LABEL: Record<string, string> = {
	ingresosEEUU: 'Indica si tendrás ingresos de EE. UU.',
	actividad: 'Selecciona la actividad económica',
	descripcionActividad: 'Describe tu giro de negocio',
	formaAdministracion: 'Selecciona la forma de administración',
	formaTributacion: 'Selecciona la forma de tributar',
	direccion: 'Completa la dirección operativa',
	pais: 'Selecciona el país',
	ciudad: 'Indica la ciudad',
	estado: 'Selecciona el estado',
	codigoPostal: 'Indica el código postal',
	facturaServicioBasicoEEUU: 'Sube la planilla de servicio básico',
	managerSCI: 'Define al menos un manager',
	responsableIRS: 'Selecciona al responsable frente al IRS',
	firma: 'Dibuja o sube tu firma',
	aceptaTerminos: 'Acepta los términos y condiciones',
};

/** Extrae el primer mensaje legible de un nodo de error de react-hook-form. */
function nodeMessage(node: unknown): string | null {
	if (!node || typeof node !== 'object') return null;
	const msg = (node as { message?: unknown }).message;
	return typeof msg === 'string' && msg.length > 0 ? msg : null;
}

/**
 * Grupo de errores: los generales del paso van sin etiqueta (`label: null`);
 * los de socios/managers se agrupan bajo "Socio 01", "Manager 02", etc., para
 * no repetir el prefijo en cada línea.
 */
interface ErrorGroup {
	label: string | null;
	messages: string[];
}

/** Resumen estructurado de errores que consume el banner. */
interface FormErrorSummary {
	/** Título principal (conteo). */
	title: string;
	/** Eyebrow opcional: "Paso 03 · Miembros". */
	eyebrow?: string;
	/** Grupos a listar (vacío → solo se muestra el título). */
	groups: ErrorGroup[];
	/** Nº de mensajes ocultos por el cap, para el "+ N más". */
	overflow: number;
}

/** Máximo de líneas de detalle mostradas antes de colapsar en "+ N más". */
const MAX_ERROR_LINES = 6;

/**
 * Recolecta los errores del paso indicado, agrupados. Para `miembros`/`managers`
 * cada entrada inválida produce un grupo con su etiqueta ("Socio 01") y la lista
 * de mensajes concretos del schema; el resto cae en el grupo general.
 */
function collectStepErrors(
	errors: Record<string, unknown>,
	step: StepId,
): ErrorGroup[] {
	const general: string[] = [];
	const entityGroups: ErrorGroup[] = [];

	const collectArray = (node: unknown, label: string) => {
		const rootMsg = nodeMessage(node);
		if (rootMsg) general.push(rootMsg);
		if (Array.isArray(node)) {
			node.forEach((entry, i) => {
				if (!entry || typeof entry !== 'object') return;
				const msgs: string[] = [];
				for (const field of Object.keys(entry)) {
					const m = nodeMessage((entry as Record<string, unknown>)[field]);
					if (m) msgs.push(m);
				}
				if (msgs.length > 0) {
					entityGroups.push({
						label: `${label} ${String(i + 1).padStart(2, '0')}`,
						messages: [...new Set(msgs)],
					});
				}
			});
		}
	};

	for (const key of Object.keys(errors)) {
		if (FIELD_STEP[key] !== step) continue;
		if (key === 'miembros') collectArray(errors[key], 'Socio');
		else if (key === 'managers') collectArray(errors[key], 'Manager');
		else general.push(nodeMessage(errors[key]) ?? FIELD_LABEL[key] ?? key);
	}

	const groups: ErrorGroup[] = [];
	if (general.length > 0)
		groups.push({ label: null, messages: [...new Set(general)] });
	groups.push(...entityGroups);
	return groups;
}

/**
 * Construye el resumen estructurado del banner para un paso concreto.
 * El conteo del título usa el total real; la lista se recorta a
 * `MAX_ERROR_LINES` y el resto se anuncia con `overflow`.
 */
function buildStepErrorSummary(
	errors: Record<string, unknown>,
	step: StepId,
): FormErrorSummary {
	const stepName = STEPS.find((s) => s.id === step)?.title ?? '';
	const groups = collectStepErrors(errors, step);
	const total = groups.reduce((n, g) => n + g.messages.length, 0);

	// Recorte respetando los grupos (no parte una entidad por la mitad).
	let budget = MAX_ERROR_LINES;
	let overflow = 0;
	const trimmed: ErrorGroup[] = [];
	for (const g of groups) {
		if (budget <= 0) {
			overflow += g.messages.length;
			continue;
		}
		const take = g.messages.slice(0, budget);
		overflow += g.messages.length - take.length;
		budget -= take.length;
		trimmed.push({ label: g.label, messages: take });
	}

	const title =
		total === 1
			? 'Falta 1 campo por completar'
			: total > 0
				? `Faltan ${total} campos por completar`
				: 'Revisa los campos marcados en rojo';

	return {
		title,
		eyebrow: `Paso ${String(step).padStart(2, '0')}${stepName ? ` · ${stepName}` : ''}`,
		groups: trimmed,
		overflow,
	};
}

/** Resumen genérico para errores que no mapean a un paso concreto. */
function genericErrorSummary(): FormErrorSummary {
	return {
		title: 'Hay datos pendientes o inválidos',
		groups: [{ label: null, messages: ['Revisa los pasos del formulario.'] }],
		overflow: 0,
	};
}

/** Envuelve un mensaje simple (errores de red/submit) en el shape del banner. */
function messageSummary(text: string): FormErrorSummary {
	return { title: text, groups: [], overflow: 0 };
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
		// onTouched: valida un campo al perder el foco (tras tocarlo) para dar
		// feedback inline temprano; el gate duro vive en el `trigger` por-paso
		// del botón "Siguiente" (ver handleNext) y en el submit final.
		mode: 'onTouched',
	});

	const { control, handleSubmit, reset } = methods;

	// Cargar draft al montar: primero el local (instantáneo); si no existe, se
	// intenta el borrador del servidor (staging) para continuar cross-device.
	const [hydrated, setHydrated] = useState(false);
	useEffect(() => {
		let cancelled = false;
		const local = loadDraft();
		if (local) {
			reset(local);
			setHydrated(true);
			return;
		}
		void fetch(`/api/incorporations/${empresaId}/form`)
			.then((r) => r.json())
			.then((res) => {
				if (cancelled) return;
				if (res?.ok && res.data?.payload) {
					reset(parseIncorporationFormPayload(res.data.payload));
				}
			})
			.catch(() => {})
			.finally(() => {
				if (!cancelled) setHydrated(true);
			});
		return () => {
			cancelled = true;
		};
	}, [loadDraft, reset, empresaId]);

	// Autosave local con debounce — observa todo el form.
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

	// Autosave write-through al staging del servidor (debounce mayor que el local).
	const serverSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
	useEffect(() => {
		if (!hydrated) return;
		if (serverSaveTimer.current) clearTimeout(serverSaveTimer.current);
		serverSaveTimer.current = setTimeout(() => {
			void saveClientDraft(watched, {
				incorporationId: empresaId,
				step: currentStep,
			});
		}, 1500);
		return () => {
			if (serverSaveTimer.current) clearTimeout(serverSaveTimer.current);
		};
	}, [watched, hydrated, empresaId, currentStep]);

	// Estado del submit.
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [submitError, setSubmitError] = useState<FormErrorSummary | null>(null);

	// Auto-limpiar el banner: mientras está visible, re-validamos ACTIVAMENTE el
	// paso en cada edición y lo cerramos en cuanto el paso es válido.
	//
	// Es necesario re-disparar `trigger` (en vez de mirar `formState.errors`)
	// porque los refinements de Zod son cross-field: el error de "sube la
	// planilla" cuelga de `facturaServicioBasicoEEUU` y el de la dirección de
	// `direccion`. RHF NO revalida el refinement de un campo cuando el usuario
	// edita OTRO campo del mismo paso, así que el error quedaría "stale" y el
	// banner lo seguiría mostrando aunque el dato ya esté completo.
	useEffect(() => {
		if (!submitError) return;
		const fields = STEP_FIELDS[currentStep];
		if (!fields) return;
		let cancelled = false;
		void methods.trigger(fields).then((valid) => {
			if (!cancelled && valid) setSubmitError(null);
		});
		return () => {
			cancelled = true;
		};
		// `watched` en deps: re-evalúa en cada edición del formulario.
	}, [watched, currentStep, submitError, methods]);

	// Porcentaje asignado — solo para mostrar (barra de asignación + resumen).
	// El gate de "suma 100%" lo aplica el schema vía `handleNext` al avanzar.
	const totalPercentage = useMemo(
		() =>
			(watched?.miembros ?? []).reduce(
				(sum, m) => sum + (m?.porcentaje || 0),
				0,
			),
		[watched],
	);

	const onSubmit = useCallback(
		async (data: ClientFormInput) => {
			setSubmitError(null);
			setIsSubmitting(true);
			try {
				const result = await submitClientForm(data, { empresaId });
				if (!result.ok) {
					setSubmitError(
						messageSummary(
							result.message ?? 'No se pudo enviar el formulario.',
						),
					);
					return;
				}
				clearDraft();
				if (result.redirectTo) {
					window.location.href = result.redirectTo;
				}
			} catch (e) {
				console.error(e);
				setSubmitError(
					messageSummary('Ocurrió un error al enviar el formulario.'),
				);
			} finally {
				setIsSubmitting(false);
			}
		},
		[empresaId, clearDraft],
	);

	/**
	 * Gate por-paso: valida solo los campos del paso actual antes de avanzar.
	 * El botón "Siguiente" queda SIEMPRE habilitado (no se deshabilita); si la
	 * validación falla, no avanza, enfoca el primer campo inválido y muestra el
	 * detalle de lo que falta. Es la pieza que garantiza consistencia paso a paso.
	 */
	const handleNext = useCallback(async () => {
		const fields = STEP_FIELDS[currentStep];
		if (!fields || fields.length === 0) {
			setSubmitError(null);
			goNext();
			return;
		}
		const valid = await methods.trigger(fields, { shouldFocus: true });
		if (!valid) {
			setSubmitError(
				buildStepErrorSummary(
					methods.formState.errors as Record<string, unknown>,
					currentStep,
				),
			);
			return;
		}
		setSubmitError(null);
		goNext();
	}, [currentStep, methods, goNext]);

	const triggerSubmit = useCallback(() => {
		void handleSubmit(onSubmit, (errors) => {
			console.warn('Errores de validación', errors);
			// Mapea el primer campo con error a su paso y navega hasta él.
			const errorStep = firstErrorStep(Object.keys(errors));
			if (errorStep) {
				goTo(errorStep);
				setSubmitError(
					buildStepErrorSummary(errors as Record<string, unknown>, errorStep),
				);
			} else {
				setSubmitError(genericErrorSummary());
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
						onClick={handleNext}
						className="inline-flex h-10 items-center gap-2 rounded-lg px-[18px] text-[14px] font-medium transition-all hover:opacity-90"
						style={{
							background: 'var(--cf-ink)',
							color: 'var(--cf-bg-card)',
							cursor: 'pointer',
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
			<IncorporationProvider incorporationId={empresaId}>
				<IncorporationRulesProvider value={rules}>
					<form onSubmit={(e) => e.preventDefault()}>
						<FormShell
							currentStep={currentStep}
							eyebrow={stepEyebrow}
							title={stepTitle}
							summary={summary}
							footer={membersFooter}
							onPrev={goPrev}
							onNext={isLastStep ? triggerSubmit : handleNext}
							onStepClick={goTo}
							// Botones siempre habilitados: la validación ocurre al hacer
							// clic (handleNext / triggerSubmit), no deshabilitando el botón.
							canGoNext={true}
							canSubmit={true}
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
									{currentStep === 2 && (
										<StepActivity activities={activities} />
									)}
									{currentStep === 3 && <StepMembers />}
									{currentStep === 4 && <StepManager />}
									{currentStep === 5 && (
										<StepConfirmation
											activities={activities}
											onEditStep={goTo}
										/>
									)}
								</motion.div>
							</AnimatePresence>

							{submitError && (
								<div
									role="alert"
									aria-live="assertive"
									className="sticky bottom-4 z-10 mt-4 flex items-start gap-3 rounded-xl border p-4 text-sm shadow-lg"
									style={{
										background: 'var(--cf-danger-soft)',
										borderColor: 'var(--cf-danger-border)',
										color: 'var(--cf-danger)',
									}}
								>
									{/* Icono de alerta */}
									<svg
										className="mt-0.5 shrink-0"
										width="18"
										height="18"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										strokeWidth="2"
										strokeLinecap="round"
										strokeLinejoin="round"
										aria-hidden="true"
									>
										<circle cx="12" cy="12" r="10" />
										<path d="M12 8v4M12 16h.01" />
									</svg>

									<div className="min-w-0 flex-1">
										<p className="font-semibold tracking-[-0.01em]">
											{submitError.title}
										</p>
										{submitError.eyebrow && (
											<p
												className="mt-0.5 text-[12px] tracking-[0.02em] uppercase opacity-70"
												style={{ color: 'var(--cf-danger)' }}
											>
												{submitError.eyebrow}
											</p>
										)}

										{submitError.groups.length > 0 && (
											<div className="mt-2.5 flex flex-col gap-2.5">
												{submitError.groups.map((group, gi) => (
													<div key={group.label ?? `g${gi}`}>
														{group.label && (
															<p className="text-[11.5px] font-semibold tracking-[0.04em] uppercase opacity-60">
																{group.label}
															</p>
														)}
														<ul className="mt-1 flex flex-col gap-1">
															{group.messages.map((msg, mi) => (
																<li
																	key={mi}
																	className="flex items-start gap-2 leading-snug"
																>
																	<span
																		className="mt-1.5 h-1 w-1 shrink-0 rounded-full"
																		style={{ background: 'currentColor' }}
																		aria-hidden="true"
																	/>
																	<span className="flex-1">{msg}</span>
																</li>
															))}
														</ul>
													</div>
												))}
												{submitError.overflow > 0 && (
													<p className="text-[12.5px] opacity-70">
														y {submitError.overflow} campo
														{submitError.overflow === 1 ? '' : 's'} más…
													</p>
												)}
											</div>
										)}
									</div>

									<button
										type="button"
										onClick={() => setSubmitError(null)}
										aria-label="Cerrar aviso"
										className="-m-1 shrink-0 rounded p-1 leading-none opacity-70 transition-opacity hover:opacity-100"
										style={{ color: 'var(--cf-danger)' }}
									>
										<svg
											width="14"
											height="14"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											strokeWidth="2"
											strokeLinecap="round"
											strokeLinejoin="round"
										>
											<path d="M18 6 6 18M6 6l12 12" />
										</svg>
									</button>
								</div>
							)}
						</FormShell>
					</form>
				</IncorporationRulesProvider>
			</IncorporationProvider>
		</FormProvider>
	);
}
