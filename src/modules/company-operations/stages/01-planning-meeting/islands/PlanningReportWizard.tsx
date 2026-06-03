import { useMemo, useState } from 'react';

type AdministrationForm = 'member_managed' | 'manager_managed';
type TaxTributation = 'pass_through' | 'corporation';
type AccountingMethod = 'cash' | 'accrual';

interface StateOption {
	id: number;
	name: string;
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
	activityName: string | null;
	initial: InitialReport;
	hasSavedReport: boolean;
}

const STEPS = [
	'Resumen de la reunión',
	'Datos de la LLC',
	'Configuración fiscal y administrativa',
	'Revisión y envío',
] as const;

const inputCls =
	'w-full rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-900 placeholder:text-gray-400 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:placeholder:text-gray-500';
const labelCls =
	'mb-1 block text-[11px] font-semibold text-gray-700 dark:text-gray-200';

function SegRadio<T extends string>({
	value,
	onChange,
	options,
}: {
	value: T | null;
	onChange: (v: T) => void;
	options: { value: T; label: string }[];
}) {
	return (
		<div className="flex flex-wrap gap-2">
			{options.map((o) => (
				<button
					key={o.value}
					type="button"
					onClick={() => onChange(o.value)}
					className={`rounded-md border px-3 py-1.5 text-xs font-semibold transition ${
						value === o.value
							? 'border-amber-500 bg-amber-500 text-white'
							: 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200'
					}`}
				>
					{o.label}
				</button>
			))}
		</div>
	);
}

export default function PlanningReportWizard({
	incorporationId,
	states,
	activityName,
	initial,
	hasSavedReport,
}: Props) {
	const [step, setStep] = useState(0);
	const [saved, setSaved] = useState(hasSavedReport);
	const [busy, setBusy] = useState<false | 'save' | 'generate'>(false);
	const [error, setError] = useState<string | null>(null);

	const [stateId, setStateId] = useState<number | null>(initial.stateId);
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
	const [meetingResume, setMeetingResume] = useState(initial.meetingResume ?? '');

	const stateName = useMemo(
		() => states.find((s) => s.id === stateId)?.name ?? '—',
		[states, stateId],
	);

	const buildPayload = () => ({
		incorporationId,
		stateId,
		activityId: initial.activityId,
		confidentiality,
		administrationForm,
		taxTributation,
		accountingMethod,
		membersNumber: membersNumber.trim() ? Number(membersNumber) : null,
		incomeUs,
		designatedManager: designatedManager.trim() || null,
		companyDescription: companyDescription.trim() || null,
		meetingResume: meetingResume.trim() || null,
	});

	const save = async () => {
		setBusy('save');
		setError(null);
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
		} catch (e) {
			setError(e instanceof Error ? e.message : 'Error al guardar');
		} finally {
			setBusy(false);
		}
	};

	const generate = async () => {
		setBusy('generate');
		setError(null);
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

	return (
		<div className="rounded-lg border border-amber-300 bg-amber-50/40 p-4 dark:border-amber-900/40 dark:bg-amber-900/10">
			{/* Stepper */}
			<ol className="mb-4 flex flex-wrap items-center gap-1.5 text-[11px]">
				{STEPS.map((label, i) => (
					<li key={label} className="flex items-center gap-1.5">
						<span
							className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
								i === step
									? 'bg-amber-500 text-white'
									: i < step
										? 'bg-amber-200 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200'
										: 'bg-gray-200 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
							}`}
						>
							{i + 1}
						</span>
						<span
							className={
								i === step
									? 'font-semibold text-gray-900 dark:text-white'
									: 'text-gray-500 dark:text-gray-400'
							}
						>
							{label}
						</span>
						{i < STEPS.length - 1 && (
							<span className="mx-0.5 text-gray-300 dark:text-gray-600">›</span>
						)}
					</li>
				))}
			</ol>

			{/* Paso 1 */}
			{step === 0 && (
				<div className="space-y-3">
					<label className="block">
						<span className={labelCls}>Resumen de la reunión (IA) </span>
						<textarea
							rows={5}
							value={meetingResume}
							onChange={(e) => setMeetingResume(e.target.value)}
							placeholder="Pega aquí el resumen generado por IA de la reunión de planificación…"
							className={inputCls}
						/>
					</label>
					<label className="block">
						<span className={labelCls}>Descripción de la empresa</span>
						<textarea
							rows={3}
							value={companyDescription}
							onChange={(e) => setCompanyDescription(e.target.value)}
							placeholder="Breve descripción del negocio del cliente…"
							className={inputCls}
						/>
					</label>
				</div>
			)}

			{/* Paso 2 */}
			{step === 1 && (
				<div className="grid gap-3 sm:grid-cols-2">
					<label className="block">
						<span className={labelCls}>Estado de incorporación</span>
						<select
							value={stateId ?? ''}
							onChange={(e) =>
								setStateId(e.target.value ? Number(e.target.value) : null)
							}
							className={inputCls}
						>
							<option value="">Seleccionar…</option>
							{states.map((s) => (
								<option key={s.id} value={s.id}>
									{s.name}
								</option>
							))}
						</select>
					</label>
					<label className="block">
						<span className={labelCls}>Actividad económica</span>
						<input
							type="text"
							value={activityName ?? '—'}
							readOnly
							className={`${inputCls} cursor-not-allowed opacity-70`}
						/>
					</label>
					<label className="block">
						<span className={labelCls}>Número de socios</span>
						<input
							type="number"
							min={0}
							value={membersNumber}
							onChange={(e) => setMembersNumber(e.target.value)}
							className={inputCls}
						/>
					</label>
					<label className="block">
						<span className={labelCls}>Gerente designado</span>
						<input
							type="text"
							value={designatedManager}
							onChange={(e) => setDesignatedManager(e.target.value)}
							placeholder="Nombre del gerente designado"
							className={inputCls}
						/>
					</label>
				</div>
			)}

			{/* Paso 3 */}
			{step === 2 && (
				<div className="space-y-4">
					<div>
						<span className={labelCls}>Tipo de tributación</span>
						<SegRadio
							value={taxTributation}
							onChange={setTaxTributation}
							options={[
								{ value: 'pass_through', label: 'Entidad de paso' },
								{ value: 'corporation', label: 'Corporación' },
							]}
						/>
					</div>
					<div>
						<span className={labelCls}>Forma de administración</span>
						<SegRadio
							value={administrationForm}
							onChange={setAdministrationForm}
							options={[
								{ value: 'member_managed', label: 'Por los miembros' },
								{ value: 'manager_managed', label: 'Por un gerente' },
							]}
						/>
					</div>
					<div>
						<span className={labelCls}>Método contable</span>
						<SegRadio
							value={accountingMethod}
							onChange={setAccountingMethod}
							options={[
								{ value: 'cash', label: 'Efectivo (cash)' },
								{ value: 'accrual', label: 'Devengado (accrual)' },
							]}
						/>
					</div>
					<div className="grid gap-4 sm:grid-cols-2">
						<div>
							<span className={labelCls}>Confidencialidad</span>
							<SegRadio
								value={confidentiality === null ? null : confidentiality ? 'y' : 'n'}
								onChange={(v) => setConfidentiality(v === 'y')}
								options={[
									{ value: 'y', label: 'Sí' },
									{ value: 'n', label: 'No' },
								]}
							/>
						</div>
						<div>
							<span className={labelCls}>¿Ingresos en EE.UU.?</span>
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

			{/* Paso 4 */}
			{step === 3 && (
				<dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
					{[
						['Estado', stateName],
						['Actividad', activityName ?? '—'],
						['Nº socios', membersNumber || '—'],
						['Gerente designado', designatedManager || '—'],
						[
							'Tributación',
							taxTributation === 'pass_through'
								? 'Entidad de paso'
								: taxTributation === 'corporation'
									? 'Corporación'
									: '—',
						],
						[
							'Administración',
							administrationForm === 'member_managed'
								? 'Por los miembros'
								: administrationForm === 'manager_managed'
									? 'Por un gerente'
									: '—',
						],
						[
							'Método contable',
							accountingMethod === 'cash'
								? 'Efectivo'
								: accountingMethod === 'accrual'
									? 'Devengado'
									: '—',
						],
						[
							'Confidencialidad',
							confidentiality === null ? '—' : confidentiality ? 'Sí' : 'No',
						],
						['Ingresos EE.UU.', incomeUs === null ? '—' : incomeUs ? 'Sí' : 'No'],
					].map(([k, v]) => (
						<div key={k as string} className="flex flex-col">
							<dt className="text-gray-500 dark:text-gray-400">{k}</dt>
							<dd className="font-semibold text-gray-900 dark:text-white">{v}</dd>
						</div>
					))}
				</dl>
			)}

			{error && (
				<p className="mt-3 rounded-md bg-red-50 px-2 py-1.5 text-[11px] font-semibold text-red-700 dark:bg-red-900/20 dark:text-red-300">
					{error}
				</p>
			)}

			{/* Controles */}
			<div className="mt-4 flex items-center justify-between gap-2">
				<button
					type="button"
					disabled={step === 0 || busy !== false}
					onClick={() => setStep((s) => Math.max(0, s - 1))}
					className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
				>
					Atrás
				</button>

				{step < STEPS.length - 1 ? (
					<button
						type="button"
						onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
						className="rounded-lg bg-gray-950 px-4 py-2 text-xs font-semibold text-white transition hover:bg-gray-800 dark:bg-white dark:text-gray-950 dark:hover:bg-gray-100"
					>
						Siguiente
					</button>
				) : (
					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={save}
							disabled={busy !== false}
							className="rounded-lg border border-amber-500 px-4 py-2 text-xs font-semibold text-amber-700 transition hover:bg-amber-50 disabled:opacity-60 dark:text-amber-300 dark:hover:bg-amber-900/20"
						>
							{busy === 'save' ? 'Guardando…' : saved ? 'Guardar cambios' : 'Guardar datos'}
						</button>
						<button
							type="button"
							onClick={generate}
							disabled={busy !== false || !saved}
							title={!saved ? 'Primero guarda los datos' : undefined}
							className="rounded-lg bg-amber-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-amber-700 disabled:opacity-60"
						>
							{busy === 'generate' ? 'Generando…' : 'Generar y enviar informe'}
						</button>
					</div>
				)}
			</div>
		</div>
	);
}
