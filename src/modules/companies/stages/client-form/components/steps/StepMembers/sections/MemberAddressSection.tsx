import { Controller, useFormContext, useWatch } from 'react-hook-form';

import { Input } from '@components/ui/Input';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@components/ui/Select';

import { Field, SubsectionCard } from '../../../../atoms';
import { ADDRESS_PLACEHOLDERS } from '../../../../data/address-placeholders';
import { COUNTRIES } from '../../../../data/countries';
import { US_STATES } from '../../../../data/us-states';
import type { ClientFormData, Member } from '../../../../types';
import { ClientFileField } from '../../../shared/ClientFileField';

interface Props {
	index: number;
	memberId: string;
	open: boolean;
	onToggle: () => void;
}

/**
 * D · Dirección del socio — shape unificado US-style.
 *   Requeridos: País · Línea 1 · Ciudad · Estado · Código postal · Planilla
 *   Opcionales: Línea 2 (apt/suite) · Condado
 */
export function MemberAddressSection({
	index,
	memberId,
	open,
	onToggle,
}: Props) {
	const { control, register } = useFormContext<ClientFormData>();

	const member = useWatch<ClientFormData>({
		control,
		name: `miembros.${index}`,
	}) as Member | undefined;

	const path = `miembros.${index}` as const;
	const isCompany = member?.tipoSocio === 'empresa';
	const isUS = member?.paisFactura === 'Estados Unidos';

	const completed = countAddressCompleted(member);

	return (
		<SubsectionCard
			kicker="D"
			title={isCompany ? 'Dirección de la empresa' : 'Dirección del socio'}
			completed={completed}
			total={6}
			open={open}
			onToggle={onToggle}
		>
			<div className="flex flex-col gap-[18px]">
				<Controller
					control={control}
					name={`${path}.paisFactura`}
					render={({ field }) => (
						<Field label="País" required>
							<Select
								value={field.value}
								onValueChange={(v) => {
									field.onChange(v);
									field.onBlur();
								}}
							>
								<SelectTrigger className="w-full">
									<SelectValue placeholder={ADDRESS_PLACEHOLDERS.country} />
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

				<Field
					label="Línea 1 (Address Line 1)"
					required
					htmlFor={`${path}.direccion`}
				>
					<Input
						id={`${path}.direccion`}
						{...register(`${path}.direccion`)}
						placeholder={ADDRESS_PLACEHOLDERS.line1}
					/>
				</Field>

				<Field
					label="Línea 2 (opcional)"
					hint="Apartamento, suite, piso, referencia."
					htmlFor={`${path}.linea2`}
				>
					<Input
						id={`${path}.linea2`}
						{...register(`${path}.linea2`)}
						placeholder={ADDRESS_PLACEHOLDERS.line2}
					/>
				</Field>

				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<Field label="Ciudad" required htmlFor={`${path}.ciudad`}>
						<Input
							id={`${path}.ciudad`}
							{...register(`${path}.ciudad`)}
							placeholder={ADDRESS_PLACEHOLDERS.city}
						/>
					</Field>
					<Field label="Condado (opcional)" htmlFor={`${path}.condado`}>
						<Input
							id={`${path}.condado`}
							{...register(`${path}.condado`)}
							placeholder={ADDRESS_PLACEHOLDERS.county}
						/>
					</Field>
				</div>

				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<Field label="Estado / Provincia" required>
						{isUS ? (
							<Controller
								control={control}
								name={`${path}.estado`}
								render={({ field }) => (
									<Select
										value={field.value}
										onValueChange={(v) => {
											field.onChange(v);
											field.onBlur();
										}}
									>
										<SelectTrigger className="w-full">
											<SelectValue
												placeholder={ADDRESS_PLACEHOLDERS.stateSelect}
											/>
										</SelectTrigger>
										<SelectContent>
											{US_STATES.map((s) => (
												<SelectItem key={s} value={s}>
													{s}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								)}
							/>
						) : (
							<Input
								id={`${path}.estado`}
								{...register(`${path}.estado`)}
								placeholder={ADDRESS_PLACEHOLDERS.stateInput}
							/>
						)}
					</Field>
					<Field
						label="Código postal (ZIP)"
						required
						htmlFor={`${path}.codigoPostal`}
					>
						<Input
							id={`${path}.codigoPostal`}
							{...register(`${path}.codigoPostal`)}
							placeholder={ADDRESS_PLACEHOLDERS.postalCode}
							maxLength={10}
						/>
					</Field>
				</div>

				<ClientFileField
					fileName={`${path}.facturaServicio`}
					pathName={`${path}.facturaServicioPath`}
					slot="member-factura"
					id={`facturaServicio-${memberId}`}
					label="Planilla de servicio básico"
					description={
						isCompany
							? 'Planilla o factura donde conste la dirección de la empresa.'
							: 'Planilla o factura donde conste la dirección del socio.'
					}
				/>
			</div>
		</SubsectionCard>
	);
}

/**
 * Cuenta los campos completados de la dirección del socio.
 * Total = 6 (los 5 requeridos del shape unificado + planilla).
 * Línea 2 y condado son opcionales y no se cuentan para el progreso.
 */
export function countAddressCompleted(member: Member | undefined): number {
	if (!member) return 0;
	let n = 0;
	if (member.paisFactura?.trim()) n++;
	if (member.direccion?.trim()) n++;
	if (member.ciudad?.trim()) n++;
	if (member.estado?.trim()) n++;
	if (member.codigoPostal?.trim()) n++;
	// Tras recargar el `File` queda en null pero la ruta en Storage persiste.
	if (member.facturaServicio || member.facturaServicioPath) n++;
	return n;
}
