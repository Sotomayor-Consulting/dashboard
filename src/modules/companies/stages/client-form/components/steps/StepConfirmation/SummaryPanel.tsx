import { Icon } from '@iconify/react';
import type { ReactNode } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';

import type { Activity } from '../../../data/activities';
import type { ClientFormData, StepId } from '../../../types';

interface Props {
	activities: Activity[];
	onEditStep?: ((step: StepId) => void) | undefined;
}

const taxLabel = (v: ClientFormData['formaTributacion']) => {
	if (v === 'pass-through') return 'Pass-Through Entity';
	if (v === 'corporation') return 'Corporación';
	return 'No especificada';
};

const adminLabel = (v: ClientFormData['formaAdministracion']) => {
	if (v === 'manager-managed') return 'Manager-Managed';
	if (v === 'member-managed') return 'Member-Managed';
	return 'No especificada';
};

const addressLabel = (data: ClientFormData) => {
	if (data.direccionOperativaEEUU === 'si') {
		const parts = [data.direccion, data.ciudad, data.estado, data.codigoPostal]
			.filter(Boolean)
			.join(', ');
		return parts || 'Pendiente';
	}
	if (data.direccionOperativaEEUU === 'sci') {
		return 'Sotomayor proveerá una dirección';
	}
	if (data.direccionOperativaEEUU === 'no')
		return 'Sin dirección operativa en EE. UU.';
	return 'No especificada';
};

function getInitials(name: string): string {
	const parts = name.trim().split(/\s+/);
	if (parts.length === 0) return '?';
	const first = parts[0]?.[0] ?? '';
	const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
	return (first + last).toUpperCase() || '?';
}

/**
 * Panel de resumen del Step 5 — 3 SummaryCards independientes con
 * botón "Editar" que navega al step correspondiente vía `onEditStep`.
 *
 * Card 1 — Información general (paso 02)
 * Card 2 — Miembros (paso 03)
 * Card 3 — Manager (paso 04)
 */
export function SummaryPanel({ activities, onEditStep }: Props) {
	const { control } = useFormContext<ClientFormData>();
	const data = useWatch<ClientFormData>({ control }) as ClientFormData;

	const activity = activities.find((a) => a.id === data.actividad);
	const actividadLabel = data.actividadNoEnLista
		? data.descripcionActividad || 'Pendiente de descripción'
		: activity
			? `${activity.irs_code} — ${activity.name_es}`
			: 'No especificada';

	const validMembers = data.miembros.filter((m) => m.nombreCompleto);
	const totalPct = validMembers.reduce(
		(sum, m) => sum + (m.porcentaje || 0),
		0,
	);

	const responsable = validMembers.find((m) => m.id === data.responsableIRS);

	return (
		<div className="mb-7 flex flex-col gap-3">
			{/* Card 1 · Información general */}
			<SummaryCard
				title="Información general"
				stepNum={2}
				onEdit={onEditStep ? () => onEditStep(2) : undefined}
			>
				<SumRow
					label="Ingresos de EE. UU."
					value={
						data.ingresosEEUU === null
							? 'No especificado'
							: data.ingresosEEUU
								? 'Sí'
								: 'No'
					}
				/>
				<SumRow label="Actividad económica" value={actividadLabel} />
				<SumRow
					label="Forma de administración"
					value={adminLabel(data.formaAdministracion)}
				/>
				<SumRow
					label="Tributación"
					value={taxLabel(data.formaTributacion)}
				/>
				<SumRow label="Dirección operativa" value={addressLabel(data)} />
			</SummaryCard>

			{/* Card 2 · Miembros */}
			<SummaryCard
				title="Miembros"
				stepNum={3}
				onEdit={onEditStep ? () => onEditStep(3) : undefined}
			>
				<SumRow
					label="Visibilidad"
					value={data.informacionMiembrosPublica ? 'Pública' : 'Privada'}
				/>
				<SumRow
					label="Total"
					value={`${validMembers.length} socio${validMembers.length === 1 ? '' : 's'} · ${totalPct}%`}
					accent={totalPct === 100}
				/>
				{validMembers.length > 0 && (
					<div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
						{validMembers.map((m) => (
							<MemberChip
								key={m.id}
								name={m.nombreCompleto}
								percentage={m.porcentaje}
							/>
						))}
					</div>
				)}
			</SummaryCard>

			{/* Card 3 · Manager */}
			<SummaryCard
				title="Manager"
				stepNum={4}
				onEdit={onEditStep ? () => onEditStep(4) : undefined}
			>
				<SumRow
					label="Manager designado"
					value={
						data.formaAdministracion === 'member-managed'
							? 'No aplica (Member-Managed)'
							: data.managerSCI === true
								? 'Sotomayor Consulting International'
								: data.managerEsMiembro === true
									? `${data.seleccionManagers.length} miembro(s) seleccionado(s)`
									: data.managers.length > 0
										? `${data.managers.length} manager(s) externo(s)`
										: 'Pendiente'
					}
				/>
				<SumRow
					label="Responsable frente al IRS"
					value={responsable?.nombreCompleto ?? 'Pendiente'}
					accent={!!responsable}
				/>
			</SummaryCard>
		</div>
	);
}

/* ════════════════════════════════════════════════════════════════
   Atoms internos
   ════════════════════════════════════════════════════════════════ */
function SummaryCard({
	title,
	stepNum,
	onEdit,
	children,
}: {
	title: string;
	stepNum: number;
	onEdit?: (() => void) | undefined;
	children: ReactNode;
}) {
	return (
		<div
			className="rounded-[14px] border p-5"
			style={{
				background: 'var(--cf-bg-card)',
				borderColor: 'var(--cf-line)',
			}}
		>
			<div className="mb-3.5 flex items-center justify-between">
				<div className="flex items-center gap-2.5">
					<span
						className="cf-mono text-[10.5px] tracking-[0.12em] uppercase"
						style={{ color: 'var(--cf-ink-soft)' }}
					>
						Paso {String(stepNum).padStart(2, '0')}
					</span>
					<span
						className="text-[15px] font-semibold tracking-[-0.005em]"
						style={{ color: 'var(--cf-ink)' }}
					>
						{title}
					</span>
				</div>
				{onEdit && (
					<button
						type="button"
						onClick={onEdit}
						className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[12px] transition-colors hover:opacity-80"
						style={{
							background: 'var(--cf-bg-card)',
							borderColor: 'var(--cf-line)',
							color: 'var(--cf-ink-mute)',
						}}
					>
						<Icon icon="ri:edit-line" className="h-[11px] w-[11px]" />
						Editar
					</button>
				)}
			</div>
			<div className="flex flex-col gap-2.5">{children}</div>
		</div>
	);
}

function SumRow({
	label,
	value,
	accent,
}: {
	label: string;
	value: ReactNode;
	accent?: boolean;
}) {
	return (
		<div className="flex items-baseline justify-between gap-3.5">
			<span className="text-[12.5px]" style={{ color: 'var(--cf-ink-mute)' }}>
				{label}
			</span>
			<span
				className="text-right text-[13px] font-medium tracking-[-0.005em]"
				style={{
					color: accent ? 'var(--cf-accent-ink)' : 'var(--cf-ink)',
				}}
			>
				{value}
			</span>
		</div>
	);
}

function MemberChip({
	name,
	percentage,
}: {
	name: string;
	percentage: number;
}) {
	return (
		<div
			className="flex items-center gap-2.5 rounded-lg border px-3 py-2.5"
			style={{
				background: 'var(--cf-bg-subtle)',
				borderColor: 'var(--cf-line-soft)',
			}}
		>
			<div
				className="grid h-7 w-7 shrink-0 place-items-center rounded-full border text-[11px] font-semibold"
				style={{
					background: 'var(--cf-bg-card)',
					borderColor: 'var(--cf-line)',
					color: 'var(--cf-ink)',
				}}
			>
				{getInitials(name)}
			</div>
			<div className="min-w-0 flex-1">
				<div
					className="truncate text-[12.5px] font-medium tracking-[-0.005em]"
					style={{ color: 'var(--cf-ink)' }}
				>
					{name}
				</div>
			</div>
			<span
				className="cf-mono shrink-0 text-[12px] font-semibold"
				style={{ color: 'var(--cf-ink)' }}
			>
				{percentage}%
			</span>
		</div>
	);
}
