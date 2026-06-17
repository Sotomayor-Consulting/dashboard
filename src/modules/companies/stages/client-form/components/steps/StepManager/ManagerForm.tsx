import { AnimatePresence, motion } from 'framer-motion';
import { Icon } from '@iconify/react';
import { Controller, useFormContext, useWatch } from 'react-hook-form';

import { Button } from '@components/ui/Button';
import { Checkbox } from '@components/ui/Checkbox';
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
import { COUNTRIES } from '../../../data/countries';
import { US_STATES } from '../../../data/us-states';
import type { ClientFormData } from '../../../types';
import { FieldError } from '../../shared/FieldError';
import { ClientFileField } from '../../shared/ClientFileField';

interface Props {
	index: number;
	managerId: string;
	canRemove: boolean;
	onRemove: () => void;
}

export function ManagerForm({ index, managerId, canRemove, onRemove }: Props) {
	const {
		control,
		register,
		formState: { errors },
	} = useFormContext<ClientFormData>();
	const path = `managers.${index}` as const;
	const managerErrors = errors.managers?.[index];

	const mismaDireccion = useWatch<ClientFormData>({
		control,
		name: `${path}.mismaDireccionEmpresa`,
	}) as boolean;

	const paisResidencia = useWatch<ClientFormData>({
		control,
		name: `${path}.paisResidencia`,
	}) as string;
	const isUS = paisResidencia === 'Estados Unidos';

	return (
		<div className="space-y-5">
			<div className="grid gap-4 sm:grid-cols-2">
				<div>
					<Label>Nombres y apellidos</Label>
					<Input
						{...register(`${path}.nombre`)}
						className="mt-1.5"
						placeholder="Juan Carlos Pérez"
					/>
					<FieldError message={managerErrors?.nombre?.message!} />
				</div>
				<div>
					<Label>Correo electrónico</Label>
					<Input
						type="email"
						{...register(`${path}.correo`)}
						className="mt-1.5"
						placeholder="manager@ejemplo.com"
					/>
					<FieldError message={managerErrors?.correo?.message!} />
				</div>
			</div>

			<div className="grid gap-4 sm:grid-cols-3">
				<div>
					<Label>¿Residente fiscal en EE.UU?</Label>
					<Controller
						control={control}
						name={`${path}.residenteFiscal`}
						render={({ field }) => (
							<Select
								value={field.value ? 'si' : 'no'}
								onValueChange={(v) => field.onChange(v === 'si')}
							>
								<SelectTrigger className="mt-1.5 w-full">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="si">Sí</SelectItem>
									<SelectItem value="no">No</SelectItem>
								</SelectContent>
							</Select>
						)}
					/>
				</div>
				<div>
					<Label>Número de ITIN</Label>
					<Input
						{...register(`${path}.itin`)}
						className="mt-1.5"
						placeholder="999-99-9999"
					/>
				</div>
				<div>
					<Label>Número de SSN</Label>
					<Input
						{...register(`${path}.ssn`)}
						className="mt-1.5"
						placeholder="999-99-9999"
					/>
				</div>
			</div>

			<div className="grid gap-4 sm:grid-cols-2">
				<div>
					<Label>Número de pasaporte</Label>
					<Input
						{...register(`${path}.numeroPasaporte`)}
						className="mt-1.5"
						placeholder="AB1234567"
					/>
				</div>
				<div>
					<Label>País de nacionalidad</Label>
					<Controller
						control={control}
						name={`${path}.nacionalidad`}
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
									{COUNTRIES.map((c) => (
										<SelectItem key={c} value={c}>
											{c}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						)}
					/>
				</div>
			</div>

			<ClientFileField
				fileName={`${path}.pasaporte`}
				pathName={`${path}.pasaportePath`}
				slot="manager-pasaporte"
				id={`pasaporteManager-${managerId}`}
				label="Pasaporte escaneado"
			/>

			<div className="border-border border-t pt-5">
				<div className="mb-4 flex items-center gap-2">
					<Controller
						control={control}
						name={`${path}.mismaDireccionEmpresa`}
						render={({ field }) => (
							<Checkbox
								id={`mismaDireccion-${managerId}`}
								checked={field.value}
								onCheckedChange={(c) => field.onChange(c === true)}
							/>
						)}
					/>
					<label
						htmlFor={`mismaDireccion-${managerId}`}
						className="cursor-pointer text-sm"
					>
						La dirección del manager es la misma que la de la empresa
					</label>
				</div>

				<AnimatePresence>
					{!mismaDireccion && (
						<motion.div
							initial={{ opacity: 0, height: 0 }}
							animate={{ opacity: 1, height: 'auto' }}
							exit={{ opacity: 0, height: 0 }}
							className="space-y-4 overflow-hidden"
						>
							{/* Dirección unificada US-style del manager. */}
							<div>
								<Label>País de residencia</Label>
								<Controller
									control={control}
									name={`${path}.paisResidencia`}
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
													placeholder={ADDRESS_PLACEHOLDERS.country}
												/>
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
							</div>

							<div>
								<Label>Línea 1 (Address Line 1)</Label>
								<Input
									{...register(`${path}.direccion`)}
									className="mt-1.5"
									placeholder={ADDRESS_PLACEHOLDERS.line1}
								/>
								<FieldError message={managerErrors?.direccion?.message!} />
							</div>

							<div>
								<Label>
									Línea 2 <span className="opacity-60">— opcional</span>
								</Label>
								<Input
									{...register(`${path}.linea2`)}
									className="mt-1.5"
									placeholder={ADDRESS_PLACEHOLDERS.line2}
								/>
							</div>

							<div className="grid gap-4 sm:grid-cols-2">
								<div>
									<Label>Ciudad</Label>
									<Input
										{...register(`${path}.ciudad`)}
										className="mt-1.5"
										placeholder={ADDRESS_PLACEHOLDERS.city}
									/>
								</div>
								<div>
									<Label>
										Condado <span className="opacity-60">— opcional</span>
									</Label>
									<Input
										{...register(`${path}.condado`)}
										className="mt-1.5"
										placeholder={ADDRESS_PLACEHOLDERS.county}
									/>
								</div>
							</div>

							<div className="grid gap-4 sm:grid-cols-2">
								<div>
									<Label>Estado / Provincia</Label>
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
											{...register(`${path}.estado`)}
											className="mt-1.5"
											placeholder={ADDRESS_PLACEHOLDERS.stateInput}
										/>
									)}
								</div>
								<div>
									<Label>Código postal (ZIP)</Label>
									<Input
										{...register(`${path}.codigoPostal`)}
										className="mt-1.5"
										placeholder={ADDRESS_PLACEHOLDERS.postalCode}
										maxLength={10}
									/>
								</div>
							</div>

							<ClientFileField
								fileName={`${path}.facturaServicio`}
								pathName={`${path}.facturaServicioPath`}
								slot="manager-factura"
								id={`facturaManager-${managerId}`}
								label="Factura de servicio básico"
							/>
						</motion.div>
					)}
				</AnimatePresence>
			</div>

			{canRemove && (
				<div className="border-border border-t pt-4">
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={onRemove}
						className="text-destructive hover:text-destructive hover:bg-destructive/10"
					>
						<Icon icon="ri:delete-bin-line" className="mr-1.5 h-4 w-4" />
						Eliminar manager
					</Button>
				</div>
			)}
		</div>
	);
}
