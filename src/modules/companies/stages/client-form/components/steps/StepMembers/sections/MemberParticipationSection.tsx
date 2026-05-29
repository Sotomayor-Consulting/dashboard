import { Controller, useFormContext, useWatch } from 'react-hook-form';

import { Input } from '@components/ui/Input';

import { Field, RadioCard, SubsectionCard } from '../../../../atoms';
import type { ClientFormData, Member } from '../../../../types';

interface Props {
	index: number;
	open: boolean;
	onToggle: () => void;
}

/**
 * B · Participación y estatus fiscal — 2 campos:
 *   - porcentaje de participación (con suffix %)
 *   - residente fiscal en EE. UU. (Sí/No)
 */
export function MemberParticipationSection({ index, open, onToggle }: Props) {
	const {
		control,
		register,
		formState: { errors },
	} = useFormContext<ClientFormData>();

	const member = useWatch<ClientFormData>({
		control,
		name: `miembros.${index}`,
	}) as Member | undefined;

	const path = `miembros.${index}` as const;
	const memberErrors = errors.miembros?.[index];

	const completed = countParticipationCompleted(member);

	return (
		<SubsectionCard
			kicker="B"
			title="Participación y estatus fiscal"
			completed={completed}
			total={2}
			open={open}
			onToggle={onToggle}
		>
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
				<Field
					label="Porcentaje de participación"
					hint="Debe sumar 100% entre todos los socios."
					required
					htmlFor={`${path}.porcentaje`}
					error={memberErrors?.porcentaje?.message as string | undefined}
				>
					<div className="relative">
						<Input
							id={`${path}.porcentaje`}
							type="number"
							min={1}
							max={100}
							{...register(`${path}.porcentaje`, { valueAsNumber: true })}
							placeholder="50"
							className="pr-9"
						/>
						<span
							className="cf-mono pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[12px]"
							style={{ color: 'var(--cf-ink-soft)' }}
						>
							%
						</span>
					</div>
				</Field>

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
	if (member.residenteFiscalEEUU !== null) n++;
	return n;
}
