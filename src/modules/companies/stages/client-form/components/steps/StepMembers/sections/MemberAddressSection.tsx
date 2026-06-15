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
import { COUNTRIES } from '../../../../data/countries';
import type { ClientFormData, Member } from '../../../../types';
import { ClientFileField } from '../../../shared/ClientFileField';

interface Props {
	index: number;
	memberId: string;
	open: boolean;
	onToggle: () => void;
}

/**
 * D · Dirección del socio — 3 campos:
 *   - país
 *   - dirección (full width)
 *   - factura de servicio básico (file)
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

	const completed = countAddressCompleted(member);

	return (
		<SubsectionCard
			kicker="D"
			title={isCompany ? 'Dirección de la empresa' : 'Dirección del socio'}
			completed={completed}
			total={3}
			open={open}
			onToggle={onToggle}
		>
			<div className="flex flex-col gap-[18px]">
				<Controller
					control={control}
					name={`${path}.paisFactura`}
					render={({ field }) => (
						<Field label="País">
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

				<Field
					label="Dirección"
					hint="Dirección que figura en la factura del servicio básico."
					htmlFor={`${path}.direccion`}
				>
					<Input
						id={`${path}.direccion`}
						{...register(`${path}.direccion`)}
						placeholder="Ciudad, calle principal, calle secundaria, código postal"
					/>
				</Field>

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

export function countAddressCompleted(member: Member | undefined): number {
	if (!member) return 0;
	let n = 0;
	if (member.paisFactura?.trim()) n++;
	if (member.direccion?.trim()) n++;
	// Tras recargar el `File` queda en null pero la ruta en Storage persiste.
	if (member.facturaServicio || member.facturaServicioPath) n++;
	return n;
}
