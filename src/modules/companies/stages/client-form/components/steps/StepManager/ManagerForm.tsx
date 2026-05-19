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

import { COUNTRIES } from '../../../data/countries';
import type { ClientFormData } from '../../../types';
import { FieldError } from '../../shared/FieldError';
import { FileUploadField } from '../../shared/FileUploadField';

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
							<Select value={field.value} onValueChange={field.onChange}>
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

			<Controller
				control={control}
				name={`${path}.pasaporte`}
				render={({ field }) => (
					<FileUploadField
						id={`pasaporteManager-${managerId}`}
						label="Pasaporte escaneado"
						file={field.value}
						onFileChange={field.onChange}
					/>
				)}
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
							<div className="grid gap-4 sm:grid-cols-2">
								<div>
									<Label>País de residencia</Label>
									<Controller
										control={control}
										name={`${path}.paisResidencia`}
										render={({ field }) => (
											<Select
												value={field.value}
												onValueChange={field.onChange}
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
								<div className="sm:col-span-2">
									<Label>Dirección del manager</Label>
									<Input
										{...register(`${path}.direccion`)}
										className="mt-1.5"
										placeholder="Calle, Ciudad, Código Postal"
									/>
									<FieldError message={managerErrors?.direccion?.message!} />
								</div>
							</div>
							<Controller
								control={control}
								name={`${path}.facturaServicio`}
								render={({ field }) => (
									<FileUploadField
										id={`facturaManager-${managerId}`}
										label="Factura de servicio básico"
										file={field.value}
										onFileChange={field.onChange}
									/>
								)}
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
