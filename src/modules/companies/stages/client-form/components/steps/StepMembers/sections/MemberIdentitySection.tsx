import { Controller, useFormContext, useWatch } from 'react-hook-form';

import { Input } from '@components/ui/Input';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@components/ui/Select';

import { Field, RadioCard, SubsectionCard } from '../../../../atoms';
import { COUNTRIES } from '../../../../data/countries';
import { MARITAL_STATUS_OPTIONS } from '../../../../data/marital-status';
import type { ClientFormData, Member } from '../../../../types';

interface Props {
	index: number;
	memberId: string;
	open: boolean;
	onToggle: () => void;
}

/**
 * A · Identidad — 5 campos:
 *   - tipo de socio (persona/empresa)
 *   - nombres y apellidos / razón social
 *   - email
 *   - estado civil (solo persona; para empresa cuenta como completado)
 *   - país de nacionalidad / país de constitución
 */
export function MemberIdentitySection({
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
	const isCompany = member?.tipoSocio === 'empresa';

	// Conteo de campos completados (los 5 de identidad)
	const completed = countCompleted(member);

	return (
		<SubsectionCard
			kicker="A"
			title="Identidad"
			completed={completed}
			total={5}
			open={open}
			onToggle={onToggle}
		>
			<div data-member-id={memberId} className="flex flex-col gap-[18px]">
				<Controller
					control={control}
					name={`${path}.tipoSocio`}
					render={({ field }) => (
						<Field label="Tipo de socio" required>
							<div className="flex gap-2.5">
								<RadioCard
									label="Persona Natural"
									selected={field.value === 'persona'}
									onClick={() => field.onChange('persona')}
								/>
								<RadioCard
									label="Empresa"
									selected={field.value === 'empresa'}
									onClick={() => field.onChange('empresa')}
								/>
							</div>
						</Field>
					)}
				/>

				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<Field
						label={isCompany ? 'Nombre de la empresa' : 'Nombres y apellidos'}
						required
						htmlFor={`${path}.nombreCompleto`}
						error={memberErrors?.nombreCompleto?.message as string | undefined}
					>
						<Input
							id={`${path}.nombreCompleto`}
							{...register(`${path}.nombreCompleto`)}
							placeholder={
								isCompany ? 'Mi Empresa S.A.S.' : 'Juan Carlos Pérez García'
							}
						/>
					</Field>
					<Field
						label="Correo electrónico"
						hint="Para notificaciones del proceso."
						required
						htmlFor={`${path}.correo`}
						error={memberErrors?.correo?.message as string | undefined}
					>
						<Input
							id={`${path}.correo`}
							type="email"
							{...register(`${path}.correo`)}
							placeholder={
								isCompany ? 'contacto@empresa.com' : 'juan@ejemplo.com'
							}
						/>
					</Field>
					{!isCompany && (
						<Controller
							control={control}
							name={`${path}.estadoCivil`}
							render={({ field }) => (
								<Field label="Estado civil">
									<Select
										value={field.value}
										onValueChange={(v) => {
											field.onChange(v);
											field.onBlur();
										}}
									>
										<SelectTrigger className="w-full">
											<SelectValue placeholder="Selecciona" />
										</SelectTrigger>
										<SelectContent>
											{MARITAL_STATUS_OPTIONS.map((s) => (
												<SelectItem key={s.value} value={s.value}>
													{s.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</Field>
							)}
						/>
					)}
					<Controller
						control={control}
						name={`${path}.nacionalidad`}
						render={({ field }) => (
							<Field
								label={
									isCompany ? 'País de constitución' : 'País de nacionalidad'
								}
								required
							>
								<Select
									value={field.value}
									onValueChange={(v) => {
										field.onChange(v);
										field.onBlur();
									}}
								>
									<SelectTrigger className="w-full">
										<SelectValue placeholder="Selecciona" />
									</SelectTrigger>
									<SelectContent>
										{COUNTRIES.map((c) => (
											<SelectItem key={c} value={c}>
												{c}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</Field>
						)}
					/>
					{isCompany && (
						<Field
							label="Sitio web"
							hint="Opcional."
							htmlFor={`${path}.sitioWeb`}
						>
							<Input
								id={`${path}.sitioWeb`}
								{...register(`${path}.sitioWeb`)}
								placeholder="https://miempresa.com"
							/>
						</Field>
					)}
				</div>
			</div>
		</SubsectionCard>
	);
}

export function countIdentityCompleted(member: Member | undefined): number {
	return countCompleted(member);
}

function countCompleted(member: Member | undefined): number {
	if (!member) return 0;
	let n = 0;
	if (member.tipoSocio) n++;
	if (member.nombreCompleto?.trim()) n++;
	if (member.correo?.trim()) n++;
	// Estado civil no aplica a empresas: cuenta como completado.
	if (member.tipoSocio === 'empresa' || member.estadoCivil) n++;
	if (member.nacionalidad?.trim()) n++;
	return n;
}
