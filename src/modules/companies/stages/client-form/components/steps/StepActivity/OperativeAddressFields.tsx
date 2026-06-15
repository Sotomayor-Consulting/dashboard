import { useEffect } from 'react';
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

import { COUNTRIES } from '../../../data/countries';
import { US_STATES } from '../../../data/us-states';
import type { ClientFormData } from '../../../types';
import { ClientFileField } from '../../shared/ClientFileField';
import { FieldError } from '../../shared/FieldError';

/**
 * Formulario de dirección operativa (siempre visible).
 * El país se preselecciona en Estados Unidos cuando la LLC tiene ingresos
 * de fuente americana; los campos Condado/Estado/Zip solo aplican a EE. UU.
 */
export function OperativeAddressFields() {
	const {
		register,
		control,
		setValue,
		getValues,
		formState: { errors },
	} = useFormContext<ClientFormData>();

	const pais = useWatch<ClientFormData>({
		control,
		name: 'pais',
	}) as string;

	const isUS = pais === 'Estados Unidos';

	// Los campos exclusivos de EE. UU. se limpian al cambiar a otro país para
	// que no queden valores huérfanos en el draft ni en el resumen final.
	useEffect(() => {
		if (pais && !isUS) {
			if (getValues('estado')) setValue('estado', '');
			if (getValues('codigoPostal')) setValue('codigoPostal', '');
			if (getValues('condado')) setValue('condado', '');
		}
	}, [pais, isUS, setValue, getValues]);

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
								<SelectValue placeholder="Selecciona un país" />
							</SelectTrigger>
							<SelectContent>
								{COUNTRIES.map((c) => (
									<SelectItem key={c} value={c}>
										{c}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					)}
				/>
				<FieldError message={errors.pais?.message as string} />
			</div>
			<div>
				<Label htmlFor="direccion">Dirección (Address Line 1)</Label>
				<Input
					id="direccion"
					{...register('direccion')}
					className="mt-1.5"
					placeholder={
						isUS ? '123 Main Street, Suite 100' : 'Calle Principal #123, Ciudad'
					}
				/>
				<FieldError message={errors.direccion?.message as string} />
			</div>
			<div className="grid gap-4 sm:grid-cols-2">
				{isUS && (
					<div>
						<Label htmlFor="condado">Condado (County)</Label>
						<Input
							id="condado"
							{...register('condado')}
							className="mt-1.5"
							placeholder="Miami-Dade"
						/>
					</div>
				)}
				<div>
					<Label htmlFor="ciudad">Ciudad (City)</Label>
					<Input
						id="ciudad"
						{...register('ciudad')}
						className="mt-1.5"
						placeholder={isUS ? 'Miami' : 'Quito'}
					/>
				</div>
			</div>
			{isUS && (
				<div className="grid gap-4 sm:grid-cols-2">
					<div>
						<Label htmlFor="estado">Estado (State)</Label>
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
										<SelectValue placeholder="Selecciona" />
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
					</div>
					<div>
						<Label htmlFor="codigoPostal">Zip Code</Label>
						<Input
							id="codigoPostal"
							{...register('codigoPostal')}
							className="mt-1.5"
							placeholder="33101"
							maxLength={10}
						/>
					</div>
				</div>
			)}
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
