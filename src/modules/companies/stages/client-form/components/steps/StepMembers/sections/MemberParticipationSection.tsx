import { Controller, useFormContext, useWatch } from 'react-hook-form';

import { Field, RadioCard, SubsectionCard } from '../../../../atoms';
import type { ClientFormData, Member } from '../../../../types';

interface Props {
	index: number;
	open: boolean;
	onToggle: () => void;
}

/**
 * B · Participación y estatus fiscal — 2 campos:
 *   - porcentaje de participación (slider 0–100 con lectura del valor)
 *   - residente fiscal en EE. UU. (Sí/No) — solo persona natural; para
 *     empresas la pregunta no aplica y cuenta como completada.
 *
 * El % usa un slider en lugar de input numérico (más fácil de ajustar),
 * pero mantiene el mismo campo `porcentaje` y su validación de suma 100%.
 */
export function MemberParticipationSection({ index, open, onToggle }: Props) {
	const {
		control,
		formState: { errors },
	} = useFormContext<ClientFormData>();

	const member = useWatch<ClientFormData>({
		control,
		name: `miembros.${index}`,
	}) as Member | undefined;

	// Suma de los demás socios → el % disponible (tope) para este socio.
	const allMembers = useWatch<ClientFormData>({
		control,
		name: 'miembros',
	}) as Member[] | undefined;
	const sumOthers = (allMembers ?? []).reduce(
		(sum, m, i) => (i === index ? sum : sum + (Number(m?.porcentaje) || 0)),
		0,
	);
	const available = Math.max(0, 100 - sumOthers);

	const path = `miembros.${index}` as const;
	const memberErrors = errors.miembros?.[index];
	const isCompany = member?.tipoSocio === 'empresa';

	const completed = countParticipationCompleted(member);

	return (
		<SubsectionCard
			kicker="B"
			title={isCompany ? 'Participación' : 'Participación y estatus fiscal'}
			completed={completed}
			total={2}
			open={open}
			onToggle={onToggle}
		>
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
				<Controller
					control={control}
					name={`${path}.porcentaje`}
					render={({ field }) => {
						const value = Math.min(Number(field.value ?? 0), available);
						return (
							<Field
								label="Porcentaje de participación"
								hint="Cada socio puede tomar como máximo el porcentaje que queda disponible. La suma debe ser 100%."
								required
								htmlFor={`${path}.porcentaje`}
								error={memberErrors?.porcentaje?.message as string | undefined}
							>
								<div className="flex items-center gap-3 pt-1">
									<input
										id={`${path}.porcentaje`}
										type="range"
										min={0}
										max={available}
										step={1}
										value={value}
										onChange={(e) =>
											field.onChange(
												Math.min(Number(e.target.value), available),
											)
										}
										className="h-1.5 flex-1 cursor-pointer accent-[var(--cf-accent)]"
										style={{ accentColor: 'var(--cf-accent)' }}
									/>
									<span
										className="w-12 shrink-0 text-right text-[15px] font-semibold tabular-nums"
										style={{ color: 'var(--cf-ink)' }}
									>
										{value}%
									</span>
								</div>
								<div
									className="mt-1.5 text-[11.5px]"
									style={{ color: 'var(--cf-ink-soft)' }}
								>
									Disponible para este socio:{' '}
									<strong style={{ color: 'var(--cf-ink-mute)' }}>
										{available}%
									</strong>
								</div>
							</Field>
						);
					}}
				/>

				{!isCompany && (
					<Controller
						control={control}
						name={`${path}.residenteFiscalEEUU`}
						render={({ field }) => (
							<Field
								label="¿Residente fiscal en EE. UU.?"
								hint="Determina si necesita SSN o ITIN."
								required
							>
								<div className="flex gap-2">
									<RadioCard
										label="Sí"
										selected={field.value === true}
										onClick={() => field.onChange(true)}
									/>
									<RadioCard
										label="No"
										selected={field.value === false}
										onClick={() => field.onChange(false)}
									/>
								</div>
							</Field>
						)}
					/>
				)}
			</div>
		</SubsectionCard>
	);
}

export function countParticipationCompleted(
	member: Member | undefined,
): number {
	if (!member) return 0;
	let n = 0;
	if ((member.porcentaje ?? 0) > 0) n++;
	// Para empresas la pregunta de residencia fiscal no aplica.
	if (member.tipoSocio === 'empresa' || member.residenteFiscalEEUU !== null)
		n++;
	return n;
}
