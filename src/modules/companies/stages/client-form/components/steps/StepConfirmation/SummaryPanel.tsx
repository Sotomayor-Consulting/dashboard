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
	const parts = [
		data.direccion,
		data.ciudad,
		data.estado,
		data.codigoPostal,
		data.pais,
	]
		.filter(Boolean)
		.join(', ');
	return parts || 'Pendiente';
};

/** Subtítulo de un socio: tipo · país (ej. "Persona Natural · Ecuador"). */
function memberSubtitle(m: ClientFormData['miembros'][number]): string {
	const tipo = m.tipoSocio === 'empresa' ? 'Empresa' : 'Persona Natural';
	const place = m.nacionalidad || m.paisFactura || '';
	return place ? `${tipo} · ${place}` : tipo;
}

/** Paleta en degradé mint → teal → azul marino (tonos fríos elegantes). */
const MEMBER_COLORS = [
	'oklch(0.82 0.16 165)', // verde menta
	'oklch(0.70 0.12 185)', // aguamarina
	'oklch(0.60 0.10 200)', // teal
	'oklch(0.50 0.09 215)', // teal profundo
	'oklch(0.43 0.08 230)', // azul petróleo
	'oklch(0.36 0.07 245)', // azul marino
];

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
				<SumRow label="Tributación" value={taxLabel(data.formaTributacion)} />
				<SumRow label="Dirección operativa" value={addressLabel(data)} />
			</SummaryCard>

			{/* Card 2 · Miembros */}
			<SummaryCard
				title="Miembros · Participación en la empresa"
				stepNum={3}
				onEdit={onEditStep ? () => onEditStep(3) : undefined}
			>
				<div
					className="flex items-center gap-1.5 text-[12.5px]"
					style={{ color: 'var(--cf-ink-mute)' }}
				>
					<span>Visibilidad</span>
					<span style={{ color: 'var(--cf-ink-faint)' }}>·</span>
					<span
						className="inline-flex items-center gap-1 font-medium"
						style={{ color: 'var(--cf-ink)' }}
					>
						{data.informacionMiembrosPublica ? 'Pública' : 'Privada'}
						<Icon
							icon={
								data.informacionMiembrosPublica
									? 'ri:lock-unlock-line'
									: 'ri:lock-line'
							}
							className="h-3.5 w-3.5"
							style={{
								color: data.informacionMiembrosPublica
									? 'var(--cf-ink-soft)'
									: 'var(--cf-accent-ink)',
							}}
						/>
					</span>
				</div>
				{validMembers.length > 0 && (
					<MembersAllocation
						members={validMembers.map((m) => ({
							id: m.id,
							name: m.nombreCompleto,
							percentage: m.porcentaje || 0,
							subtitle: memberSubtitle(m),
							isResponsable: m.id === data.responsableIRS,
						}))}
						total={totalPct}
					/>
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

interface AllocationMember {
	id: string;
	name: string;
	percentage: number;
	subtitle: string;
	isResponsable: boolean;
}

/**
 * Resumen de participación de socios: donut chart con el total asignado al
 * centro + leyenda con color, nombre y porcentaje de cada socio.
 */
function MembersAllocation({
	members,
	total,
}: {
	members: AllocationMember[];
	total: number;
}) {
	return (
		<div className="mt-3 flex flex-col items-center gap-5 sm:flex-row sm:gap-7">
			<AllocationDonut members={members} total={total} />
			<ul className="flex w-full min-w-0 flex-1 flex-col gap-3">
				{members.map((m, i) => (
					<li key={m.id} className="flex items-center gap-3">
						<span
							className="mt-1 h-2.5 w-2.5 shrink-0 self-start rounded-[3px]"
							style={{
								background: MEMBER_COLORS[i % MEMBER_COLORS.length],
							}}
							aria-hidden="true"
						/>
						<div className="min-w-0 flex-1">
							<div className="flex items-center gap-2">
								<span
									className="truncate text-[13.5px] font-semibold tracking-[-0.005em]"
									style={{ color: 'var(--cf-ink)' }}
								>
									{m.name}
								</span>
								{m.isResponsable && (
									<span
										className="inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10.5px] font-semibold"
										style={{
											background: 'var(--cf-accent-soft)',
											color: 'var(--cf-accent-ink)',
										}}
									>
										Responsable IRS
									</span>
								)}
							</div>
							{m.subtitle && (
								<div
									className="mt-0.5 truncate text-[11.5px]"
									style={{ color: 'var(--cf-ink-soft)' }}
								>
									{m.subtitle}
								</div>
							)}
						</div>
						<span
							className="shrink-0 self-start rounded-md border px-2.5 py-1 text-[12.5px] font-semibold tabular-nums"
							style={{
								borderColor: 'var(--cf-line)',
								background: 'var(--cf-bg-card)',
								color: 'var(--cf-ink)',
							}}
						>
							{m.percentage}%
						</span>
					</li>
				))}
			</ul>
		</div>
	);
}

/** Donut SVG con segmentos proporcionales y total al centro. */
function AllocationDonut({
	members,
	total,
}: {
	members: AllocationMember[];
	total: number;
}) {
	const size = 120;
	const stroke = 14;
	const r = (size - stroke) / 2;
	const c = 2 * Math.PI * r;

	let offset = 0;
	const segments = members.map((m, i) => {
		const frac = Math.max(0, Math.min(100, m.percentage)) / 100;
		const seg = {
			color: MEMBER_COLORS[i % MEMBER_COLORS.length],
			dash: frac * c,
			offset: offset * c,
		};
		offset += frac;
		return seg;
	});

	return (
		<div className="relative shrink-0" style={{ width: size, height: size }}>
			<svg
				width={size}
				height={size}
				viewBox={`0 0 ${size} ${size}`}
				className="-rotate-90"
			>
				{/* Track */}
				<circle
					cx={size / 2}
					cy={size / 2}
					r={r}
					fill="none"
					stroke="var(--cf-bg-subtle)"
					strokeWidth={stroke}
				/>
				{segments.map((s, i) => (
					<circle
						key={i}
						cx={size / 2}
						cy={size / 2}
						r={r}
						fill="none"
						stroke={s.color}
						strokeWidth={stroke}
						strokeDasharray={`${s.dash} ${c - s.dash}`}
						strokeDashoffset={-s.offset}
						strokeLinecap="butt"
					/>
				))}
			</svg>
			<div className="absolute inset-0 flex flex-col items-center justify-center">
				<span
					className="text-[22px] font-semibold tracking-[-0.02em] tabular-nums"
					style={{ color: 'var(--cf-ink)' }}
				>
					{total}%
				</span>
				<span
					className="text-[10.5px] tracking-[0.04em] uppercase"
					style={{ color: 'var(--cf-ink-soft)' }}
				>
					asignado
				</span>
			</div>
		</div>
	);
}
