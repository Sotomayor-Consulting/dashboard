import { Icon } from '@iconify/react';
import { Controller, useFormContext } from 'react-hook-form';

import { cn } from '@components/utils';
import { Button } from '@components/ui/Button';
import { Input } from '@components/ui/Input';
import { Label } from '@components/ui/Label';
import { RadioGroup, RadioGroupItem } from '@components/ui/RadioGroup';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@components/ui/Select';

import { COUNTRIES } from '../../../data/countries'; // legacy file, not imported
import { MARITAL_STATUS_OPTIONS } from '../../../data/marital-status';
import type { ClientFormData } from '../../../types';
import { FieldError } from '../../shared/FieldError';
import { FieldTooltip } from '../../shared/FieldTooltip';
import { FileUploadField } from '../../shared/FileUploadField';

interface Props {
	index: number;
	memberId: string;
	canRemove: boolean;
	onRemove: () => void;
}

export function MemberForm({ index, memberId, canRemove, onRemove }: Props) {
	const {
		control,
		register,
		formState: { errors },
	} = useFormContext<ClientFormData>();

	const path = `miembros.${index}` as const;
	const memberErrors = errors.miembros?.[index];

	return (
		<div className="space-y-5" data-member-id={memberId}>
			{/* Tipo de socio */}
			<fieldset className="space-y-2">
				<legend className="text-foreground text-sm font-medium">
					Tipo de socio
				</legend>
				<Controller
					control={control}
					name={`${path}.tipoSocio`}
					render={({ field }) => (
						<RadioGroup
							value={field.value}
							onValueChange={field.onChange}
							className="flex gap-4"
						>
							{[
								{ v: 'persona', label: 'Persona Natural' },
								{ v: 'empresa', label: 'Empresa' },
							].map((opt) => (
								<label
									key={opt.v}
									className={cn(
										'flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-all',
										field.value === opt.v
											? 'border-accent bg-accent/5'
											: 'border-border hover:border-accent/50',
									)}
								>
									<RadioGroupItem value={opt.v} />
									<span>{opt.label}</span>
								</label>
							))}
						</RadioGroup>
					)}
				/>
			</fieldset>

			<div className="grid gap-4 sm:grid-cols-2">
				<div>
					<Label>Nombres y apellidos</Label>
					<Input
						{...register(`${path}.nombreCompleto`)}
						className="mt-1.5"
						placeholder="Juan Carlos Pérez García"
					/>
					<FieldError message={memberErrors?.nombreCompleto?.message!} />
				</div>
				<div>
					<Label>
						Correo electrónico
						<FieldTooltip text="Necesario para enviar documentos y solicitar la firma digital." />
					</Label>
					<Input
						type="email"
						{...register(`${path}.correo`)}
						className="mt-1.5"
						placeholder="juan@ejemplo.com"
					/>
					<FieldError message={memberErrors?.correo?.message!} />
				</div>
			</div>

			<div className="grid gap-4 sm:grid-cols-3">
				<div>
					<Label>Estado civil</Label>
					<Controller
						control={control}
						name={`${path}.estadoCivil`}
						render={({ field }) => (
							<Select value={field.value} onValueChange={field.onChange}>
								<SelectTrigger className="mt-1.5 w-full">
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
						)}
					/>
				</div>
				<div>
					<Label>
						Porcentaje (%)
						<FieldTooltip text="Porcentaje de participación en la LLC. La suma total debe ser 100%." />
					</Label>
					<Input
						type="number"
						min={1}
						max={100}
						{...register(`${path}.porcentaje`, { valueAsNumber: true })}
						className="mt-1.5"
						placeholder="50"
					/>
					<FieldError message={memberErrors?.porcentaje?.message!} />
				</div>
				<div>
					<Label>Residente fiscal en EE.UU.</Label>
					<Controller
						control={control}
						name={`${path}.residenteFiscalEEUU`}
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
			</div>

			<div className="grid gap-4 sm:grid-cols-2">
				<div>
					<Label>Número de pasaporte</Label>
					<Input
						{...register(`${path}.numeroPasaporte`)}
						className="mt-1.5"
						placeholder="AB1234567"
					/>
					<FieldError message={memberErrors?.numeroPasaporte?.message!} />
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

			<div className="grid gap-4 sm:grid-cols-2">
				<div>
					<Label>
						Número de SSN
						<FieldTooltip text="Ingresar si posee uno." />
					</Label>
					<Input
						{...register(`${path}.ssn`)}
						className="mt-1.5"
						placeholder="999-99-9999"
					/>
				</div>
				<div>
					<Label>
						Número de ITIN
						<FieldTooltip text="Ingresar si posee uno." />
					</Label>
					<Input
						{...register(`${path}.itin`)}
						className="mt-1.5"
						placeholder="999-99-9999"
					/>
				</div>
			</div>

			<Controller
				control={control}
				name={`${path}.pasaporte`}
				render={({ field }) => (
					<FileUploadField
						id={`pasaporte-${memberId}`}
						label="Pasaporte"
						file={field.value}
						onFileChange={field.onChange}
					/>
				)}
			/>

			<div className="border-border mt-5 border-t pt-5">
				<h4 className="text-foreground mb-4 font-medium">
					Dirección del socio
				</h4>
				<div className="grid gap-4 sm:grid-cols-2">
					<div>
						<Label>País</Label>
						<Controller
							control={control}
							name={`${path}.paisFactura`}
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
					<div className="sm:col-span-2">
						<Label>
							Dirección
							<FieldTooltip text="Dirección que figura en la planilla de servicio." />
						</Label>
						<Input
							{...register(`${path}.direccion`)}
							className="mt-1.5"
							placeholder="Ciudad, Calle Principal, Calle Secundaria, Código Postal"
						/>
					</div>
				</div>
				<div className="mt-4">
					<Controller
						control={control}
						name={`${path}.facturaServicio`}
						render={({ field }) => (
							<FileUploadField
								id={`facturaServicio-${memberId}`}
								label="Factura de servicio básico"
								description="Factura donde conste la dirección del miembro."
								file={field.value}
								onFileChange={field.onChange}
							/>
						)}
					/>
				</div>
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
						Eliminar socio
					</Button>
				</div>
			)}
		</div>
	);
}
