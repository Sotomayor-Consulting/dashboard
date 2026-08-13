import * as React from 'react';
import { Icon } from '@iconify/react';

import type { CompanyMemberItem, MemberItem } from '../types';
import { MemberRoleBadges } from './cells/MemberRoleBadges';
import { MemberTypeBadge } from './cells/MemberTypeBadge';
import {
	memberDisplayName,
	memberIdentificationTypeLabel,
} from './cells/member-display';

const MARITAL_LABEL: Record<string, string> = {
	single: 'Soltero/a',
	married: 'Casado/a',
	widowed: 'Viudo/a',
	divorced: 'Divorciado/a',
	legally_separated: 'Separación legal',
	civil_union: 'Unión civil',
	annulled: 'Anulado',
};

interface Props {
	member: MemberItem;
	row: CompanyMemberItem | null;
}

/**
 * Encabezado del sheet de miembro, calcado del drawer de empresas
 * (`@modules/admin/empresas/drawer/EmpresaDrawer`): dos secciones apiladas de
 * `px-5 py-5` separadas por línea — badges + avatar/nombre/contexto arriba, y
 * el bloque de datos etiquetados debajo, en rejilla de dos columnas.
 *
 * Es solo lectura; editar vive en el menú ⋮ del sheet.
 */
export default function MemberSummaryCard({ member, row }: Props) {
	const isEntity = member.person_type === 'entity';
	const [revealSensitive, setRevealSensitive] = React.useState(false);

	const hasSensitive = Boolean(member.ssn || member.itin);
	const missingCount = countMissing(member);

	const contextLine =
		[
			row?.start_date ? `Desde ${formatDate(row.start_date)}` : null,
			row?.percentage != null ? `${row.percentage}% de participación` : null,
		]
			.filter(Boolean)
			.join(' · ') || 'Sin datos de la relación';

	return (
		<>
			{/* Identidad */}
			<div className="border-b border-gray-200 px-5 py-5 dark:border-gray-800">
				{/* `pr-20` deja libre la esquina del ⋮ y la X. */}
				<div className="flex flex-wrap items-center gap-2 pr-20">
					<MemberTypeBadge type={member.person_type} />
					{row ? <MemberRoleBadges row={row} /> : null}
				</div>
				<div className="mt-3 flex items-center gap-3">
					<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100 dark:bg-neutral-800">
						{isEntity ? (
							<Icon
								icon="ri:building-line"
								className="h-5 w-5 text-gray-500 dark:text-gray-400"
							/>
						) : (
							<span className="text-[13px] font-semibold text-gray-500 dark:text-gray-400">
								{initials(member)}
							</span>
						)}
					</div>
					<div className="min-w-0">
						<p className="text-[16px] leading-snug font-semibold text-gray-900 dark:text-gray-100">
							{memberDisplayName(member)}
						</p>
						<p className="mt-0.5 text-[11.5px] text-gray-500 dark:text-gray-400">
							{contextLine}
						</p>
					</div>
				</div>
			</div>

			{/* Datos del miembro */}
			<section className="px-5 py-5">
				<div className="mb-3 flex items-center justify-between gap-3">
					<p className="text-[10px] font-semibold tracking-wider text-gray-500 uppercase dark:text-gray-400">
						Datos del miembro
					</p>
					{missingCount > 0 ? (
						<span className="flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400">
							<Icon icon="ri:error-warning-line" className="h-3.5 w-3.5" />
							{missingCount === 1
								? 'Falta 1 dato'
								: `Faltan ${missingCount} datos`}
						</span>
					) : null}
				</div>

				<dl className="grid grid-cols-2 gap-3 text-[12px]">
					<KV
						label="Tipo de ID"
						value={memberIdentificationTypeLabel(member)}
					/>
					<KV
						label="Nº de identificación"
						value={member.identification_number}
						mono
					/>
					{isEntity ? (
						<KV
							label="Fecha de constitución"
							value={formatDate(member.incorporation_date)}
						/>
					) : (
						<>
							<KV
								label="Fecha de nacimiento"
								value={formatDate(member.birth_date)}
							/>
							<KV
								label="Estado civil"
								value={
									member.marital_status
										? (MARITAL_LABEL[member.marital_status] ??
											member.marital_status)
										: null
								}
							/>
							<KV
								label="SSN"
								value={maskSensitive(member.ssn, revealSensitive)}
								mono
							/>
							<KV
								label="ITIN"
								value={maskSensitive(member.itin, revealSensitive)}
								mono
							/>
						</>
					)}
				</dl>

				{hasSensitive ? (
					<button
						type="button"
						onClick={() => setRevealSensitive((prev) => !prev)}
						className="text-muted-foreground hover:text-foreground mt-3 flex items-center gap-1 text-[11px]"
					>
						<Icon
							icon={revealSensitive ? 'ri:eye-off-line' : 'ri:eye-line'}
							className="h-3.5 w-3.5"
						/>
						{revealSensitive ? 'Ocultar' : 'Mostrar'} SSN/ITIN
					</button>
				) : null}
			</section>
		</>
	);
}

/** Mismo par etiqueta/valor que el drawer de empresas. */
function KV({
	label,
	value,
	mono,
}: {
	label: string;
	value: string | null | undefined;
	mono?: boolean;
}) {
	return (
		<div className="min-w-0">
			<dt className="text-[10px] font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
				{label}
			</dt>
			<dd
				className={
					'mt-0.5 break-words text-gray-900 dark:text-gray-100 ' +
					(mono ? 'font-mono tabular-nums' : '')
				}
			>
				{value || <span className="text-gray-400 italic">—</span>}
			</dd>
		</div>
	);
}

function countMissing(member: MemberItem): number {
	const values =
		member.person_type === 'entity'
			? [member.identification_number, member.incorporation_date]
			: [
					member.identification_number,
					member.birth_date,
					member.marital_status,
					member.ssn,
					member.itin,
				];
	return values.filter((value) => !value).length;
}

function initials(member: MemberItem) {
	const parts = [member.first_name, member.last_name]
		.map((part) => part?.trim()?.[0])
		.filter(Boolean);
	if (parts.length === 0) {
		return (member.name?.trim()?.[0] ?? '?').toUpperCase();
	}
	return parts.join('').toUpperCase();
}

function formatDate(value: string | null): string | null {
	if (!value) return null;
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) return null;
	return parsed.toLocaleDateString('es-ES');
}

/**
 * SSN e ITIN se enmascaran por defecto: el sheet se abre a menudo con alguien
 * mirando la pantalla y estos son los dos datos que no deberían quedar a la
 * vista sin que nadie los haya pedido.
 */
function maskSensitive(value: string | null, reveal: boolean): string | null {
	const trimmed = value?.trim();
	if (!trimmed) return null;
	if (reveal) return trimmed;
	return `•••• ${trimmed.slice(-4)}`;
}
