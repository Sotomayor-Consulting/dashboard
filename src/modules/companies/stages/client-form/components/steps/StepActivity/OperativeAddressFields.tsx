import { Controller, useFormContext, useWatch } from 'react-hook-form';

import { Input } from '@components/ui/Input';
import { Label } from '@components/ui/Label';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@components/ui/Select';

import { ADDRESS_PLACEHOLDERS } from '../../../data/address-placeholders';
import { US_STATES } from '../../../data/us-states';
import type { CountryOption } from '../../../services/get-client-form-data';
import type { ClientFormData } from '../../../types';
import { ClientFileField } from '../../shared/ClientFileField';
import { FieldError } from '../../shared/FieldError';

interface Props {
	countries: CountryOption[];
}

export function OperativeAddressFields({ countries }: Props) {
	const {
		register,
		control,
		formState: { errors },
	} = useFormContext<ClientFormData>();

	const pais = useWatch<ClientFormData>({
		control,
		name: 'pais',
	}) as string;

	const isUS = pais === 'Estados Unidos';

	return (
		<div className="bg-muted/50 space-y-4 rounded-lg p-4">
			<div>
				<Label htmlFor="pais">País</Label>
				<Controller
					control={control}
					name="pais"
					render={({ field }) => (
						<Select
							value={field.value}
							onValueChange={(v) => {
								field.onChange(v);
								field.onBlur();
							}}
						>
							<SelectTrigger className="mt-1.5 w-full">
								<SelectValue placeholder={ADDRESS_PLACEHOLDERS.country} />
							</SelectTrigger>
							<SelectContent>
								{countries.map((c) => (
									<SelectItem key={c.iso} value={c.name}>
										{c.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					)}
				/>
				<FieldError message={errors.pais?.message as string} />
			</div>

			<div>
				<Label htmlFor="direccion">Línea 1 (Address Line 1)</Label>
				<Input
					id="direccion"
					{...register('direccion')}
					className="mt-1.5"
					placeholder={ADDRESS_PLACEHOLDERS.line1}
				/>
				<FieldError message={errors.direccion?.message as string} />
			</div>

			<div>
				<Label htmlFor="linea2">
					Línea 2 (Address Line 2){' '}
					<span className="opacity-60">— opcional</span>
				</Label>
				<Input
					id="linea2"
					{...register('linea2')}
					className="mt-1.5"
					placeholder={ADDRESS_PLACEHOLDERS.line2}
				/>
			</div>

			<div className="grid gap-4 sm:grid-cols-2">
				<div>
					<Label htmlFor="ciudad">Ciudad (City)</Label>
					<Input
						id="ciudad"
						{...register('ciudad')}
						className="mt-1.5"
						placeholder={ADDRESS_PLACEHOLDERS.city}
					/>
					<FieldError message={errors.ciudad?.message as string} />
				</div>
				<div>
					<Label htmlFor="condado">
						Condado (County) <span className="opacity-60">— opcional</span>
					</Label>
					<Input
						id="condado"
						{...register('condado')}
						className="mt-1.5"
						placeholder={ADDRESS_PLACEHOLDERS.county}
					/>
				</div>
			</div>

			<div className="grid gap-4 sm:grid-cols-2">
				<div>
					<Label htmlFor="estado">Estado / Provincia (State)</Label>
					{isUS ? (
						<Controller
							control={control}
							name="estado"
							render={({ field }) => (
								<Select
									value={field.value}
									onValueChange={(v) => {
										field.onChange(v);
										field.onBlur();
									}}
								>
									<SelectTrigger className="mt-1.5 w-full">
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
							id="estado"
							{...register('estado')}
							className="mt-1.5"
							placeholder={ADDRESS_PLACEHOLDERS.stateInput}
						/>
					)}
					<FieldError message={errors.estado?.message as string} />
				</div>
				<div>
					<Label htmlFor="codigoPostal">Código postal (ZIP)</Label>
					<Input
						id="codigoPostal"
						{...register('codigoPostal')}
						className="mt-1.5"
						placeholder={ADDRESS_PLACEHOLDERS.postalCode}
						maxLength={10}
					/>
					<FieldError message={errors.codigoPostal?.message as string} />
				</div>
			</div>

			<ClientFileField
				fileName="facturaServicioBasicoEEUU"
				pathName="facturaServicioBasicoEEUUPath"
				slot="company-utility-us"
				id="facturaServicioBasicoEEUU"
				label="Planilla de servicio básico"
				description="Factura de luz, agua o gas que verifique la dirección donde opera tu empresa."
				{...(errors.facturaServicioBasicoEEUU?.message
					? { error: errors.facturaServicioBasicoEEUU.message as string }
					: {})}
			/>
		</div>
	);
}
