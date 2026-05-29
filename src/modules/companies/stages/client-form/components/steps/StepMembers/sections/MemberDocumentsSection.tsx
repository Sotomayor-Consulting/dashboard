import { Controller, useFormContext, useWatch } from 'react-hook-form';

import { Input } from '@components/ui/Input';

import { Field, SubsectionCard } from '../../../../atoms';
import type { ClientFormData, Member } from '../../../../types';
import { FileUploadField } from '../../../shared/FileUploadField';

interface Props {
	index: number;
	memberId: string;
	open: boolean;
	onToggle: () => void;
}

/**
 * C · Identificación y documentos.
 * El total de campos depende de si es residente fiscal:
 *   - Residente fiscal: SSN + pasaporte (file) → 2 campos
 *   - No residente:     pasaporte # + ITIN (opcional) + pasaporte file → 3 (ITIN cuenta como completo si está vacío también)
 *
 * Para mantener simple el counter, total = 3 fijo:
 *   1. número (pasaporte o SSN según residencia)
 *   2. ITIN (solo cuenta si NO es residente; siempre cuenta como completo si vacío)
 *   3. archivo de pasaporte
 */
export function MemberDocumentsSection({
	index,
	memberId,
	open,
	onToggle,
}: Props) {
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

	const isResident = member?.residenteFiscalEEUU === true;
	const completed = countDocumentsCompleted(member);
	const total = 3;

	return (
		<SubsectionCard
			kicker="C"
			title="Identificación y documentos"
			completed={completed}
			total={total}
			open={open}
			onToggle={onToggle}
		>
			<div className="flex flex-col gap-[18px]">
				{isResident ? (
					<Field
						label="Número de SSN"
						hint="Social Security Number — requerido para residentes fiscales en EE. UU."
						required
						htmlFor={`${path}.ssn`}
					>
						<Input
							id={`${path}.ssn`}
							{...register(`${path}.ssn`)}
							placeholder="999-99-9999"
						/>
					</Field>
				) : (
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
						<Field
							label="Número de pasaporte"
							required
							htmlFor={`${path}.numeroPasaporte`}
							error={
								memberErrors?.numeroPasaporte?.message as string | undefined
							}
						>
							<Input
								id={`${path}.numeroPasaporte`}
								{...register(`${path}.numeroPasaporte`)}
								placeholder="AB1234567"
							/>
						</Field>
						<Field
							label="Número de ITIN"
							hint="Opcional — ingresa si ya posees un Individual Taxpayer Identification Number."
							htmlFor={`${path}.itin`}
						>
							<Input
								id={`${path}.itin`}
								{...register(`${path}.itin`)}
								placeholder="999-99-9999"
							/>
						</Field>
					</div>
				)}

				<Controller
					control={control}
					name={`${path}.pasaporte`}
					render={({ field }) => (
						<FileUploadField
							id={`pasaporte-${memberId}`}
							label="Pasaporte (escaneo)"
							file={field.value}
							onFileChange={field.onChange}
						/>
					)}
				/>
			</div>
		</SubsectionCard>
	);
}

export function countDocumentsCompleted(member: Member | undefined): number {
	if (!member) return 0;
	const isResident = member.residenteFiscalEEUU === true;
	let n = 0;
	if (isResident) {
		if (member.ssn?.trim()) n++;
		// Aún se cuenta 3 total para consistencia; el "campo identificador"
		// vale 1 y ITIN siempre se cuenta como completo (opcional).
		n++; // ITIN opcional, no rompe el conteo
	} else {
		if (member.numeroPasaporte?.trim()) n++;
		// ITIN opcional — se cuenta siempre como "completo".
		n++;
	}
	if (member.pasaporte) n++;
	return n;
}
