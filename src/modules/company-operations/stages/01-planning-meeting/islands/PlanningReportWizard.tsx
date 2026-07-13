import { Icon } from '@iconify/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
	deriveTaxClassification,
	TAX_CLASSIFICATION_LABEL,
} from '@domains/workflow/stages/tax-classification';

type AdministrationForm = 'member_managed' | 'manager_managed';
type TaxTributation = 'pass_through' | 'corporation';
type AccountingMethod = 'cash' | 'accrual';

interface StateOption {
	id: number;
	name: string;
}

export interface ActivityOption {
	id: string;
	irs_code: string;
	name_es: string;
	name_en: string;
}

export interface InitialReport {
	stateId: number | null;
	activityId: number | null;
	confidentiality: boolean | null;
	administrationForm: AdministrationForm | null;
	taxTributation: TaxTributation | null;
	accountingMethod: AccountingMethod | null;
	membersNumber: number | null;
	incomeUs: boolean | null;
	designatedManager: string | null;
	companyDescription: string | null;
	meetingResume: string | null;
}

interface Props {
	incorporationId: string;
	states: StateOption[];
	activities: ActivityOption[];
	initial: InitialReport;
	hasSavedReport: boolean;
}

const STEPS = [
	{
		label: 'Reunión',
		title: 'Resumen de la reunión',
		desc: 'Notas y descripción de la empresa',
	},
	{
		label: 'Empresa',
		title: 'Datos de la LLC',
		desc: 'Estado, socios y gerente designado',
	},
	{
		label: 'Fiscal',
		title: 'Configuración fiscal',
		desc: 'Tributación, administración y método contable',
	},
	{
		label: 'Revisión',
		title: 'Revisión final',
		desc: 'Verifica los datos antes de generar',
	},
] as const;

// ─── Shared styles ───────────────────────────────────────────────

const inputCls =
	'w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500';

const textareaCls = `${inputCls} resize-none`;

// ─── Activity Combobox ───────────────────────────────────────────

function ActivityCombobox({
	activities,
	value,
	onChange,
}: {
	activities: ActivityOption[];
	value: string | null;
	onChange: (id: string | null) => void;
}) {
	const [query, setQuery] = useState('');
	const [isOpen, setIsOpen] = useState(false);
	const wrapperRef = useRef<HTMLDivElement>(null);

	const selected = useMemo(
		() => activities.find((a) => a.id === value) ?? null,
		[activities, value],
	);

	const filtered = useMemo(() => {
		if (!query.trim()) return activities;
		const q = query.toLowerCase();
		return activities.filter(
			(a) =>
				a.irs_code.toLowerCase().includes(q) ||
				a.name_es.toLowerCase().includes(q) ||
				a.name_en.toLowerCase().includes(q),
		);
	}, [activities, query]);

	useEffect(() => {
		const handler = (e: MouseEvent) => {
			if (
				wrapperRef.current &&
				!wrapperRef.current.contains(e.target as Node)
			) {
				setIsOpen(false);
			}
		};
		document.addEventListener('mousedown', handler);
		return () => document.removeEventListener('mousedown', handler);
	}, []);

	const displayValue = selected
		? `${selected.irs_code} — ${selected.name_es}`
		: '';

	return (
		<div ref={wrapperRef} className="relative">
			<input
				type="text"
				value={isOpen ? query : displayValue}
				placeholder="Buscar por código IRS o nombre…"
				onChange={(e) => {
					setQuery(e.target.value);
					if (!isOpen) setIsOpen(true);
				}}
				onFocus={() => {
					setIsOpen(true);
					setQuery('');
				}}
				className={inputCls}
			/>
			{selected && !isOpen && (
				<button
					type="button"
					onClick={() => {
						onChange(null);
						setQuery('');
						setIsOpen(true);
					}}
					className="absolute top-1/2 right-3 -translate-y-1/2 rounded p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
				>
					<svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
						<path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
					</svg>
				</button>
			)}
			{isOpen && (
				<ul className="absolute z-50 mt-1 max-h-52 w-full overflow-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800">
					{filtered.length === 0 ? (
						<li className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
							Sin resultados
						</li>
					) : (
						filtered.map((a) => (
							<li key={a.id}>
								<button
									type="button"
									onClick={() => {
										onChange(a.id);
										setIsOpen(false);
										setQuery('');
									}}
									className={`flex w-full items-baseline gap-2 px-3 py-2 text-left text-sm transition hover:bg-blue-50 dark:hover:bg-blue-900/20 ${
										a.id === value
											? 'bg-blue-50 font-semibold text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
											: 'text-gray-700 dark:text-gray-200'
									}`}
								>
									<span className="shrink-0 font-mono text-xs text-gray-500 dark:text-gray-400">
										{a.irs_code}
									</span>
									<span className="truncate">{a.name_es}</span>
								</button>
							</li>
						))
					)}
				</ul>
			)}
		</div>
	);
}

// ─── Sub-components ──────────────────────────────────────────────

function FieldLabel({
	children,
	required,
	hint,
	htmlFor,
}: {
	children: React.ReactNode;
	required?: boolean;
	hint?: string;
	htmlFor?: string;
}) {
	return (
		<div className="mb-2">
			<label
				htmlFor={htmlFor}
				className="text-sm font-semibold text-gray-800 dark:text-gray-100"
			>
				{children}
				{required && <span className="ml-1 text-red-500">*</span>}
			</label>
			{hint && (
				<p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
					{hint}
				</p>
			)}
		</div>
	);
}

function CharCount({ value, max }: { value: string; max: number }) {
	const len = value.length;
	const warn = len > max * 0.9;
	return (
		<span
			className={`mt-1.5 block text-right text-xs ${warn ? 'text-red-500 dark:text-red-400' : 'text-gray-400 dark:text-gray-500'}`}
		>
			{len.toLocaleString()}/{max.toLocaleString()}
		</span>
	);
}

function SegRadio<T extends string>({
	value,
	onChange,
	options,
}: {
	value: T | null;
	onChange: (v: T) => void;
	options: { value: T; label: string; desc?: string }[];
}) {
	return (
		<div className="flex flex-wrap gap-3">
			{options.map((o) => {
				const active = value === o.value;
				return (
					<button
						key={o.value}
						type="button"
						onClick={() => onChange(o.value)}
						title={o.desc}
						className={`group relative flex flex-1 items-center gap-2 rounded-xl border-2 px-4 py-2.5 text-left transition-all ${
							active
								? 'border-blue-600 bg-blue-50 shadow-sm dark:border-blue-400 dark:bg-blue-900/20'
								: 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-600'
						}`}
					>
						<span
							className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition ${
								active
									? 'border-blue-600 bg-blue-600 dark:border-blue-400 dark:bg-blue-400'
									: 'border-gray-300 dark:border-gray-600'
							}`}
						>
							{active && (
								<svg
									className="h-3 w-3 text-white"
									viewBox="0 0 20 20"
									fill="currentColor"
								>
									<path
										fillRule="evenodd"
										d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
										clipRule="evenodd"
									/>
								</svg>
							)}
						</span>
						<span
							className={`flex-1 text-sm font-semibold ${active ? 'text-blue-700 dark:text-blue-200' : 'text-gray-700 dark:text-gray-200'}`}
						>
							{o.label}
						</span>
						{o.desc && (
							<svg
								className="h-4 w-4 shrink-0 text-gray-400 transition group-hover:text-gray-500 dark:text-gray-500 dark:group-hover:text-gray-400"
								viewBox="0 0 20 20"
								fill="currentColor"
							>
								<path
									fillRule="evenodd"
									d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z"
									clipRule="evenodd"
								/>
							</svg>
						)}
					</button>
				);
			})}
		</div>
	);
}

function ReviewCard({
	label,
	value,
	onEdit,
}: {
	label: string;
	value: string;
	onEdit: () => void;
}) {
	const empty = value === '—' || !value;
	return (
		<div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800/40">
			<div className="min-w-0">
				<dt className="text-xs font-medium text-gray-500 dark:text-gray-400">
					{label}
				</dt>
				<dd
					className={`mt-0.5 text-sm font-semibold ${empty ? 'text-gray-400 italic dark:text-gray-500' : 'text-gray-900 dark:text-white'}`}
				>
					{value || '—'}
				</dd>
			</div>
			<button
				type="button"
				onClick={onEdit}
				className="ml-3 shrink-0 rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-200/60 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200"
				title="Editar"
			>
				<svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
					<path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" />
				</svg>
			</button>
		</div>
	);
}

// ─── Validation ──────────────────────────────────────────────────

function validateStep(
	step: number,
	state: {
		meetingResume: string;
		stateId: number | null;
		taxTributation: TaxTributation | null;
		administrationForm: AdministrationForm | null;
		accountingMethod: AccountingMethod | null;
		confidentiality: boolean | null;
		incomeUs: boolean | null;
	},
): string[] {
	const errors: string[] = [];
	if (step === 0) {
		if (!state.meetingResume.trim())
			errors.push('El resumen de la reunión es requerido');
	}
	if (step === 1) {
		if (!state.stateId) errors.push('Selecciona un estado de incorporación');
	}
	if (step === 2) {
		if (!state.taxTributation) errors.push('Selecciona el tipo de tributación');
		if (!state.administrationForm)
			errors.push('Selecciona la forma de administración');
		if (!state.accountingMethod) errors.push('Selecciona el método contable');
		if (state.confidentiality === null) errors.push('Indica confidencialidad');
		if (state.incomeUs === null)
			errors.push('Indica si hay ingresos en EE.UU.');
	}
	return errors;
}

// ─── Main component ─────────────────────────────────────────────

export default function PlanningReportWizard({
	incorporationId,
	states,
	activities,
	initial,
	hasSavedReport,
}: Props) {
	const [open, setOpen] = useState(false);
	const [step, setStep] = useState(0);
	const [saved, setSaved] = useState(hasSavedReport);
	useEffect(() => { setSaved(hasSavedReport); }, [hasSavedReport]);
	const [busy, setBusy] = useState<false | 'save' | 'generate'>(false);
	const [error, setError] = useState<string | null>(null);
	const [successMsg, setSuccessMsg] = useState<string | null>(null);
	const [validationErrors, setValidationErrors] = useState<string[]>([]);
	const dialogRef = useRef<HTMLDialogElement>(null);

	const [stateId, setStateId] = useState<number | null>(initial.stateId);
	const [activityId, setActivityId] = useState<string | null>(
		initial.activityId != null ? String(initial.activityId) : null,
	);
	const [membersNumber, setMembersNumber] = useState<string>(
		initial.membersNumber != null ? String(initial.membersNumber) : '',
	);
	const [designatedManager, setDesignatedManager] = useState(
		initial.designatedManager ?? '',
	);
	const [taxTributation, setTaxTributation] = useState<TaxTributation | null>(
		initial.taxTributation,
	);
	const [administrationForm, setAdministrationForm] =
		useState<AdministrationForm | null>(initial.administrationForm);
	const [accountingMethod, setAccountingMethod] =
		useState<AccountingMethod | null>(initial.accountingMethod);
	const [confidentiality, setConfidentiality] = useState<boolean | null>(
		initial.confidentiality,
	);
	const [incomeUs, setIncomeUs] = useState<boolean | null>(initial.incomeUs);
	const [companyDescription, setCompanyDescription] = useState(
		initial.companyDescription ?? '',
	);
	const [meetingResume, setMeetingResume] = useState(
		initial.meetingResume ?? '',
	);

	const stateName = useMemo(
		() => states.find((s) => s.id === stateId)?.name ?? '—',
		[states, stateId],
	);

	const activityDisplay = useMemo(() => {
		const a = activities.find((a) => a.id === activityId);
		return a ? `${a.irs_code} — ${a.name_es}` : '—';
	}, [activities, activityId]);

	// Clasificación fiscal IRS derivada: pass_through + 1 socio ⇒ disregarded,
	// pass_through + 2+ socios ⇒ partnership, corporación ⇒ corporation.
	const membersCount = membersNumber.trim() ? Number(membersNumber) : null;
	const taxClassification = useMemo(
		() => deriveTaxClassification(taxTributation, membersCount),
		[taxTributation, membersCount],
	);

	// Dialog open/close
	useEffect(() => {
		const dialog = dialogRef.current;
		if (!dialog) return;
		if (open) {
			dialog.showModal();
			document.body.style.overflow = 'hidden';
		} else {
			dialog.close();
			document.body.style.overflow = '';
		}
		return () => {
			document.body.style.overflow = '';
		};
	}, [open]);

	const formState = {
		meetingResume,
		stateId,
		taxTributation,
		administrationForm,
		accountingMethod,
		confidentiality,
		incomeUs,
	};

	const tryAdvance = useCallback(() => {
		const errors = validateStep(step, formState);
		if (errors.length > 0) {
			setValidationErrors(errors);
			return;
		}
		setValidationErrors([]);
		setError(null);
		setSuccessMsg(null);
		setStep((s) => Math.min(STEPS.length - 1, s + 1));
	}, [step, formState]);

	const goBack = useCallback(() => {
		setValidationErrors([]);
		setError(null);
		setSuccessMsg(null);
		setStep((s) => Math.max(0, s - 1));
	}, []);

	const goToStep = useCallback((i: number) => {
		setValidationErrors([]);
		setError(null);
		setSuccessMsg(null);
		setStep(i);
	}, []);

	const buildPayload = () => ({
		incorporationId,
		stateId,
		activityId: activityId ? Number(activityId) : null,
		confidentiality,
		administrationForm,
		taxTributation,
		accountingMethod,
		membersNumber: membersCount,
		taxClassification,
		incomeUs,
		designatedManager: designatedManager.trim() || null,
		companyDescription: companyDescription.trim() || null,
		meetingResume: meetingResume.trim() || null,
	});

	const save = async () => {
		setBusy('save');
		setError(null);
		setSuccessMsg(null);
		try {
			const res = await fetch('/api/workflow/planning/report', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(buildPayload()),
			});
			const data = await res.json();
			if (!res.ok || !data.ok) {
				throw new Error(data.error ?? 'No se pudo guardar');
			}
			setSaved(true);
			setSuccessMsg('Datos guardados correctamente');
		} catch (e) {
			setError(e instanceof Error ? e.message : 'Error al guardar');
		} finally {
			setBusy(false);
		}
	};

	const generate = async () => {
		setBusy('generate');
		setError(null);
		setSuccessMsg(null);
		try {
			const res = await fetch('/api/workflow/planning/generate-report', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ incorporationId }),
			});
			const data = await res.json();
			if (!res.ok || !data.ok) {
				throw new Error(data.error ?? 'No se pudo generar el informe');
			}
			window.location.reload();
		} catch (e) {
			setError(e instanceof Error ? e.message : 'Error al generar');
			setBusy(false);
		}
	};

	const completedSteps = useMemo(() => {
		const done: boolean[] = [];
		for (let i = 0; i < STEPS.length - 1; i++) {
			done.push(validateStep(i, formState).length === 0);
		}
		done.push(false);
		return done;
	}, [formState]);

	const reviewItems: { label: string; value: string; step: number }[] = [
		{ label: 'Estado de incorporación', value: stateName, step: 1 },
		{ label: 'Actividad económica', value: activityDisplay, step: 1 },
		{ label: 'Nº de socios', value: membersNumber || '—', step: 1 },
		{ label: 'Gerente designado', value: designatedManager || '—', step: 1 },
		{
			label: 'Tributación',
			value:
				taxTributation === 'pass_through'
					? 'Entidad de paso'
					: taxTributation === 'corporation'
						? 'Corporación'
						: '—',
			step: 2,
		},
		{
			label: 'Clasificación fiscal (IRS)',
			value: taxClassification ? TAX_CLASSIFICATION_LABEL[taxClassification] : '—',
			step: 2,
		},
		{
			label: 'Administración',
			value:
				administrationForm === 'member_managed'
					? 'Por los miembros'
					: administrationForm === 'manager_managed'
						? 'Por un gerente'
						: '—',
			step: 2,
		},
		{
			label: 'Método contable',
			value:
				accountingMethod === 'cash'
					? 'Efectivo'
					: accountingMethod === 'accrual'
						? 'Devengado'
						: '—',
			step: 2,
		},
		{
			label: 'Confidencialidad',
			value: confidentiality === null ? '—' : confidentiality ? 'Sí' : 'No',
			step: 2,
		},
		{
			label: 'Ingresos EE.UU.',
			value: incomeUs === null ? '—' : incomeUs ? 'Sí' : 'No',
			step: 2,
		},
	];

	const currentStep = STEPS[step];

	return (
		<>
			{/* ── Trigger button ──────────────────────────────── */}
			<button
				type="button"
				onClick={() => setOpen(true)}
				className="flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3.5 text-left transition hover:border-gray-300 hover:shadow-sm dark:border-gray-700 dark:bg-transparent dark:hover:border-gray-600"
			>
				<Icon icon="ri:draft-line" className="h-5 w-5 text-gray-500" />
				<div className="min-w-0 flex-1">
					<p className="text-sm font-semibold text-gray-950 dark:text-white">
						Informe de planificación y diseño
					</p>
					<p className="text-xs text-gray-500 dark:text-gray-400">
						{saved
							? 'Datos guardados — click para editar o generar'
							: 'Click para llenar los datos del informe'}
					</p>
				</div>
				<svg
					className="h-5 w-5 shrink-0 text-gray-400"
					viewBox="0 0 20 20"
					fill="currentColor"
				>
					<path
						fillRule="evenodd"
						d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z"
						clipRule="evenodd"
					/>
				</svg>
			</button>

			{/* ── Modal ───────────────────────────────────────── */}
			<dialog
				ref={dialogRef}
				onClose={() => setOpen(false)}
				className="m-0 h-full w-full max-w-none border-0 bg-transparent p-0 backdrop:bg-black/50"
			>
				<div className="flex h-full items-center justify-center p-4 sm:p-6">
					<div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 shadow-2xl dark:border-gray-700 dark:bg-neutral-950">
						{/* ── Modal header ─────────────────────── */}
						<div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
							<div>
								<h2 className="text-base font-bold text-gray-950 dark:text-white">
									{currentStep?.title}
								</h2>
								<p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
									Paso {step + 1} de {STEPS.length} — {currentStep?.desc}
								</p>
							</div>
							<button
								type="button"
								onClick={() => setOpen(false)}
								className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200"
							>
								<svg
									className="h-5 w-5"
									viewBox="0 0 20 20"
									fill="currentColor"
								>
									<path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
								</svg>
							</button>
						</div>

						{/* ── Stepper ─────────────────────────── */}
						<div className="flex border-b border-gray-100 dark:border-gray-800">
							{STEPS.map((s, i) => {
								const isCurrent = i === step;
								const isDone = completedSteps[i];
								return (
									<button
										key={s.label}
										type="button"
										onClick={() => {
											if (i <= step || isDone) goToStep(i);
										}}
										disabled={i > step && !isDone}
										className={`group relative flex flex-1 items-center justify-center gap-2 px-3 py-3 text-xs font-semibold transition ${
											isCurrent
												? 'text-blue-700 dark:text-blue-300'
												: isDone
													? 'cursor-pointer text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
													: 'cursor-default text-gray-400 dark:text-gray-600'
										}`}
									>
										<span
											className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition ${
												isCurrent
													? 'bg-blue-600 text-white'
													: isDone
														? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
														: 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-600'
											}`}
										>
											{isDone && !isCurrent ? (
												<svg
													className="h-3.5 w-3.5"
													viewBox="0 0 20 20"
													fill="currentColor"
												>
													<path
														fillRule="evenodd"
														d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
														clipRule="evenodd"
													/>
												</svg>
											) : (
												i + 1
											)}
										</span>
										<span className="hidden sm:inline">{s.label}</span>
										{isCurrent && (
											<span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-blue-600 dark:bg-blue-400" />
										)}
									</button>
								);
							})}
						</div>

						{/* ── Step content (scrollable) ───────── */}
						<div className="flex-1 overflow-y-auto px-6 py-6">
							{currentStep?.desc && (
								<p className="mb-5 text-sm text-gray-500 dark:text-gray-400">
									{currentStep.desc}
								</p>
							)}

							{/* Paso 1: Reunión */}
							{step === 0 && (
								<div className="space-y-5">
									<div>
										<FieldLabel
											required
											hint="Pega el resumen generado por IA o escribe las notas principales"
										>
											Resumen de la reunión
										</FieldLabel>
										<textarea
											rows={8}
											value={meetingResume}
											onChange={(e) => setMeetingResume(e.target.value)}
											placeholder="Puntos discutidos, decisiones tomadas, próximos pasos…"
											className={textareaCls}
											maxLength={5000}
										/>
										<CharCount value={meetingResume} max={5000} />
									</div>
									<div>
										<FieldLabel hint="Breve resumen del giro comercial del cliente">
											Descripción de la empresa
										</FieldLabel>
										<textarea
											rows={4}
											value={companyDescription}
											onChange={(e) => setCompanyDescription(e.target.value)}
											placeholder="Ej: Empresa de consultoría tecnológica enfocada en desarrollo de software para el sector salud…"
											className={textareaCls}
											maxLength={2000}
										/>
										<CharCount value={companyDescription} max={2000} />
									</div>
								</div>
							)}

							{/* Paso 2: Datos LLC */}
							{step === 1 && (
								<div className="space-y-5">
									<div>
										<FieldLabel required>
											Actividad económica (código IRS)
										</FieldLabel>
										<ActivityCombobox
											activities={activities}
											value={activityId}
											onChange={setActivityId}
										/>
									</div>
									<div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
										<div>
											<FieldLabel required>Estado de incorporación</FieldLabel>
											<select
												value={stateId ?? ''}
												onChange={(e) =>
													setStateId(
														e.target.value ? Number(e.target.value) : null,
													)
												}
												className={inputCls}
											>
												<option value="">Seleccionar estado…</option>
												{states.map((s) => (
													<option key={s.id} value={s.id}>
														{s.name}
													</option>
												))}
											</select>
										</div>
										<div>
											<FieldLabel>Número de socios</FieldLabel>
											<input
												type="number"
												min={1}
												value={membersNumber}
												onChange={(e) => setMembersNumber(e.target.value)}
												placeholder="Ej: 2"
												className={inputCls}
											/>
										</div>
									</div>
									<div>
										<FieldLabel>Gerente designado</FieldLabel>
										<input
											type="text"
											value={designatedManager}
											onChange={(e) => setDesignatedManager(e.target.value)}
											placeholder="Nombre completo"
											className={inputCls}
										/>
									</div>
								</div>
							)}

							{/* Paso 3: Config fiscal */}
							{step === 2 && (
								<div className="space-y-6">
									<div>
										<FieldLabel required>Tipo de tributación</FieldLabel>
										<SegRadio
											value={taxTributation}
											onChange={setTaxTributation}
											options={[
												{
													value: 'pass_through',
													label: 'Entidad de paso',
													desc: 'Los ingresos pasan directamente a los miembros',
												},
												{
													value: 'corporation',
													label: 'Corporación',
													desc: 'La LLC tributa como entidad separada',
												},
											]}
										/>
										{taxClassification ? (
											<div className="mt-2.5 flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs dark:border-blue-900/50 dark:bg-blue-900/15">
												<Icon
													icon="ri:government-line"
													className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400"
												/>
												<span className="text-gray-600 dark:text-gray-300">
													Clasificación fiscal IRS:{' '}
													<strong className="font-semibold text-blue-700 dark:text-blue-300">
														{TAX_CLASSIFICATION_LABEL[taxClassification]}
													</strong>
												</span>
											</div>
										) : (
											taxTributation === 'pass_through' && (
												<p className="mt-2.5 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
													<Icon
														icon="ri:information-line"
														className="h-4 w-4 shrink-0"
													/>
													Define el nº de socios para determinar si es
													disregarded entity o partnership.
												</p>
											)
										)}
									</div>
									<div>
										<FieldLabel required>Forma de administración</FieldLabel>
										<SegRadio
											value={administrationForm}
											onChange={setAdministrationForm}
											options={[
												{
													value: 'member_managed',
													label: 'Por los miembros',
													desc: 'Todos los socios participan en la administración',
												},
												{
													value: 'manager_managed',
													label: 'Por un gerente',
													desc: 'Un gerente designado toma las decisiones',
												},
											]}
										/>
									</div>
									<div>
										<FieldLabel required>Método contable</FieldLabel>
										<SegRadio
											value={accountingMethod}
											onChange={setAccountingMethod}
											options={[
												{
													value: 'cash',
													label: 'Efectivo (cash)',
													desc: 'Registra cuando se recibe o paga',
												},
												{
													value: 'accrual',
													label: 'Devengado (accrual)',
													desc: 'Registra cuando se genera la obligación',
												},
											]}
										/>
									</div>
									<div className="grid gap-6 sm:grid-cols-2">
										<div>
											<FieldLabel required>Confidencialidad</FieldLabel>
											<SegRadio
												value={
													confidentiality === null
														? null
														: confidentiality
															? 'y'
															: 'n'
												}
												onChange={(v) => setConfidentiality(v === 'y')}
												options={[
													{ value: 'y', label: 'Sí' },
													{ value: 'n', label: 'No' },
												]}
											/>
										</div>
										<div>
											<FieldLabel required>¿Ingresos en EE.UU.?</FieldLabel>
											<SegRadio
												value={incomeUs === null ? null : incomeUs ? 'y' : 'n'}
												onChange={(v) => setIncomeUs(v === 'y')}
												options={[
													{ value: 'y', label: 'Sí' },
													{ value: 'n', label: 'No' },
												]}
											/>
										</div>
									</div>
								</div>
							)}

							{/* Paso 4: Revisión */}
							{step === 3 && (
								<div className="space-y-5">
									{meetingResume.trim() && (
										<div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4 dark:border-gray-700 dark:bg-gray-800/40">
											<div className="flex items-center justify-between">
												<span className="text-xs font-semibold tracking-wider text-gray-500 uppercase dark:text-gray-400">
													Resumen de la reunión
												</span>
												<button
													type="button"
													onClick={() => goToStep(0)}
													className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-200/60 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200"
													title="Editar"
												>
													<svg
														className="h-4 w-4"
														viewBox="0 0 20 20"
														fill="currentColor"
													>
														<path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" />
													</svg>
												</button>
											</div>
											<p className="mt-2 line-clamp-4 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
												{meetingResume}
											</p>
										</div>
									)}

									<div className="grid gap-3 sm:grid-cols-2">
										{reviewItems.map((item) => (
											<ReviewCard
												key={item.label}
												label={item.label}
												value={item.value}
												onEdit={() => goToStep(item.step)}
											/>
										))}
									</div>
								</div>
							)}

							{/* ── Validation / error / success ─── */}
							{validationErrors.length > 0 && (
								<div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-800/50 dark:bg-red-900/10">
									<p className="mb-2 text-sm font-semibold text-red-800 dark:text-red-300">
										Completa los campos requeridos:
									</p>
									<ul className="space-y-1">
										{validationErrors.map((e) => (
											<li
												key={e}
												className="flex items-center gap-2 text-sm text-red-700 dark:text-red-400"
											>
												<span className="h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
												{e}
											</li>
										))}
									</ul>
								</div>
							)}

							{error && (
								<div className="mt-5 flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
									<svg
										className="h-5 w-5 shrink-0"
										viewBox="0 0 20 20"
										fill="currentColor"
									>
										<path
											fillRule="evenodd"
											d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z"
											clipRule="evenodd"
										/>
									</svg>
									{error}
								</div>
							)}

							{successMsg && (
								<div className="mt-5 flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300">
									<svg
										className="h-5 w-5 shrink-0"
										viewBox="0 0 20 20"
										fill="currentColor"
									>
										<path
											fillRule="evenodd"
											d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
											clipRule="evenodd"
										/>
									</svg>
									{successMsg}
								</div>
							)}
						</div>

						{/* ── Footer controls ─────────────────── */}
						<div className="flex items-center justify-between border-t border-gray-200 px-6 py-4 dark:border-gray-700">
							<button
								type="button"
								disabled={step === 0 || busy !== false}
								onClick={goBack}
								className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-40 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
							>
								<svg
									className="h-4 w-4"
									viewBox="0 0 20 20"
									fill="currentColor"
								>
									<path
										fillRule="evenodd"
										d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z"
										clipRule="evenodd"
									/>
								</svg>
								Atrás
							</button>

							{step < STEPS.length - 1 ? (
								<button
									type="button"
									onClick={tryAdvance}
									className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
								>
									Siguiente
									<svg
										className="h-4 w-4"
										viewBox="0 0 20 20"
										fill="currentColor"
									>
										<path
											fillRule="evenodd"
											d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z"
											clipRule="evenodd"
										/>
									</svg>
								</button>
							) : (
								<div className="flex items-center gap-3">
									<button
										type="button"
										onClick={save}
										disabled={busy !== false}
										className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-60 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-white/5"
									>
										{busy === 'save' ? (
											<>
												<svg
													className="h-4 w-4 animate-spin"
													viewBox="0 0 24 24"
													fill="none"
													stroke="currentColor"
													strokeWidth="2.5"
												>
													<circle
														cx="12"
														cy="12"
														r="10"
														strokeDasharray="50"
														strokeDashoffset="15"
														strokeLinecap="round"
													/>
												</svg>
												Guardando…
											</>
										) : saved ? (
											'Guardar cambios'
										) : (
											'Guardar datos'
										)}
									</button>
									<button
										type="button"
										onClick={generate}
										disabled={busy !== false || !saved}
										title={!saved ? 'Primero guarda los datos' : undefined}
										className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60 dark:bg-blue-500 dark:hover:bg-blue-600"
									>
										{busy === 'generate' ? (
											<>
												<svg
													className="h-4 w-4 animate-spin"
													viewBox="0 0 24 24"
													fill="none"
													stroke="currentColor"
													strokeWidth="2.5"
												>
													<circle
														cx="12"
														cy="12"
														r="10"
														strokeDasharray="50"
														strokeDashoffset="15"
														strokeLinecap="round"
													/>
												</svg>
												Generando…
											</>
										) : (
											<>
												<svg
													className="h-4 w-4"
													viewBox="0 0 20 20"
													fill="currentColor"
												>
													<path
														fillRule="evenodd"
														d="M4.5 2A1.5 1.5 0 003 3.5v13A1.5 1.5 0 004.5 18h11a1.5 1.5 0 001.5-1.5V7.621a1.5 1.5 0 00-.44-1.06l-4.12-4.122A1.5 1.5 0 0011.378 2H4.5zm4.75 11.25a.75.75 0 001.5 0v-2.546l.943.942a.75.75 0 101.06-1.06l-2.22-2.22a.75.75 0 00-1.06 0l-2.22 2.22a.75.75 0 001.06 1.06l.937-.938v2.542z"
														clipRule="evenodd"
													/>
												</svg>
												Generar y enviar
											</>
										)}
									</button>
								</div>
							)}
						</div>
					</div>
				</div>
			</dialog>
		</>
	);
}
