import { AnimatePresence, motion } from 'framer-motion';
import { Icon } from '@iconify/react';
import { Controller, useFormContext, useWatch } from 'react-hook-form';

import { cn } from '@components/utils';
import { Button } from '@components/ui/Button';
import { Checkbox } from '@components/ui/Checkbox';
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
import { Textarea } from '@components/ui/Textarea';

import type { Activity } from '../../../data/activities';
import type { ClientFormData } from '../../../types';
import { ActivityCombobox } from '../../shared/ActivityCombobox';
import { FieldError } from '../../shared/FieldError';
import { FieldTooltip } from '../../shared/FieldTooltip';
import { YesNoRadio } from '../../shared/YesNoRadio';
import { OperativeAddressFields } from './OperativeAddressFields';

interface Props {
	activities: Activity[];
}

export function StepActivity({ activities }: Props) {
	const {
		control,
		register,
		setValue,
		formState: { errors },
	} = useFormContext<ClientFormData>();

	const actividadNoEnLista = useWatch<ClientFormData>({
		control,
		name: 'actividadNoEnLista',
	}) as boolean;

	return (
		<div className="space-y-8">
			<div>
				<h2 className="text-foreground text-2xl font-semibold">
					Actividad de la compañía
				</h2>
				<p className="text-muted-foreground mt-1">
					Información sobre la actividad económica de su LLC.
				</p>
			</div>

			{/* Ingresos EE. UU. */}
			<fieldset className="space-y-3">
				<legend className="text-foreground flex items-center text-sm font-medium">
					¿Tu LLC obtendrá ingresos provenientes de Estados Unidos?
					<FieldTooltip text="Esta información es indispensable para determinar tus responsabilidades fiscales ante el IRS." />
				</legend>
				<Controller
					control={control}
					name="ingresosEEUU"
					render={({ field }) => (
						<YesNoRadio value={field.value} onChange={field.onChange} />
					)}
				/>
				<FieldError message={errors.ingresosEEUU?.message as string} />
			</fieldset>

			{/* Actividad */}
			<div className="space-y-4">
				<div>
					<Label htmlFor="actividad" className="text-sm font-medium">
						Actividad
					</Label>
					<div className="mt-2">
						<Controller
							control={control}
							name="actividad"
							render={({ field }) => (
								<ActivityCombobox
									activities={activities}
									value={field.value}
									onChange={(id) => {
										field.onChange(id);
										if (id) setValue('actividadNoEnLista', false);
									}}
									disabled={actividadNoEnLista}
								/>
							)}
						/>
					</div>
					<FieldError message={errors.actividad?.message as string} />
				</div>

				<div className="flex items-center gap-2">
					<Controller
						control={control}
						name="actividadNoEnLista"
						render={({ field }) => (
							<Checkbox
								id="actividadNoEnLista"
								checked={field.value}
								onCheckedChange={(checked) => {
									field.onChange(checked === true);
									if (checked) setValue('actividad', '');
								}}
							/>
						)}
					/>
					<label
						htmlFor="actividadNoEnLista"
						className="cursor-pointer text-sm"
					>
						Mi actividad no está en la lista
					</label>
				</div>

				<AnimatePresence>
					{actividadNoEnLista && (
						<motion.div
							initial={{ opacity: 0, height: 0 }}
							animate={{ opacity: 1, height: 'auto' }}
							exit={{ opacity: 0, height: 0 }}
							className="overflow-hidden"
						>
							<div className="bg-muted/50 space-y-4 rounded-lg p-4">
								<div>
									<Label
										htmlFor="descripcionActividad"
										className="text-sm font-medium"
									>
										Describa la actividad
										<FieldTooltip text="Describe cuál será la actividad económica de tu empresa." />
									</Label>
									<Textarea
										id="descripcionActividad"
										{...register('descripcionActividad')}
										className="mt-2"
										placeholder="Ej: Servicios de consultoría en tecnología de la información…"
										rows={3}
									/>
									<FieldError
										message={errors.descripcionActividad?.message as string}
									/>
								</div>
								<div>
									<Label
										htmlFor="codigoActividad"
										className="text-sm font-medium"
									>
										Código de actividad
										<FieldTooltip text="Ingresa el código de la actividad según el IRS." />
									</Label>
									<div className="mt-2 flex gap-2">
										<Input
											id="codigoActividad"
											{...register('codigoActividad')}
											placeholder="Ej: 541512"
										/>
										<Button
											variant="outline"
											size="sm"
											className="shrink-0"
											type="button"
											render={
												<a
													href="https://www.irs.gov/pub/irs-soi/18pf_business_codes.pdf"
													target="_blank"
													rel="noopener noreferrer"
												>
													Ver códigos
													<Icon
														icon="ri:external-link-line"
														className="ml-1 h-3.5 w-3.5"
													/>
												</a>
											}
										/>
									</div>
								</div>
							</div>
						</motion.div>
					)}
				</AnimatePresence>
			</div>

			{/* Forma de administrar */}
			<fieldset className="space-y-3">
				<legend className="text-foreground text-sm font-medium">
					Forma de administrar
				</legend>
				<Controller
					control={control}
					name="formaAdministracion"
					render={({ field }) => (
						<RadioGroup
							value={field.value}
							onValueChange={field.onChange}
							className="grid gap-3 sm:grid-cols-2"
						>
							<label
								className={cn(
									'flex cursor-pointer items-start gap-3 rounded-lg border-2 p-4 transition-all',
									field.value === 'manager-managed'
										? 'border-accent bg-accent/5'
										: 'border-border hover:border-accent/50',
								)}
							>
								<RadioGroupItem value="manager-managed" className="mt-0.5" />
								<div>
									<span className="text-foreground font-medium">
										Manager-Managed
									</span>
									<p className="text-muted-foreground mt-0.5 text-xs">
										Una persona designada gestiona la empresa
									</p>
								</div>
							</label>
							<label
								className={cn(
									'flex cursor-pointer items-start gap-3 rounded-lg border-2 p-4 transition-all',
									field.value === 'member-managed'
										? 'border-accent bg-accent/5'
										: 'border-border hover:border-accent/50',
								)}
							>
								<RadioGroupItem value="member-managed" className="mt-0.5" />
								<div>
									<span className="text-foreground font-medium">
										Member-Managed
									</span>
									<p className="text-muted-foreground mt-0.5 text-xs">
										Todos los socios gestionan la empresa
									</p>
								</div>
							</label>
						</RadioGroup>
					)}
				/>
				<FieldError message={errors.formaAdministracion?.message as string} />
			</fieldset>

			{/* Tributación */}
			<div>
				<Label htmlFor="formaTributacion" className="text-sm font-medium">
					Forma de tributar / Tax Classification
				</Label>
				<Controller
					control={control}
					name="formaTributacion"
					render={({ field }) => (
						<Select value={field.value} onValueChange={field.onChange}>
							<SelectTrigger className="mt-2 w-full">
								<SelectValue placeholder="Selecciona una opción" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="pass-through">
									Entidad de paso (Pass-Through Entity)
								</SelectItem>
								<SelectItem value="corporation">
									Corporación (Corporation)
								</SelectItem>
							</SelectContent>
						</Select>
					)}
				/>
				<FieldError message={errors.formaTributacion?.message as string} />
			</div>

			{/* Dirección operativa */}
			<fieldset className="space-y-3">
				<legend className="text-foreground text-sm font-medium">
					¿Tiene una dirección operativa en EE. UU.?
				</legend>
				<Controller
					control={control}
					name="direccionOperativaEEUU"
					render={({ field }) => (
						<RadioGroup
							value={field.value}
							onValueChange={field.onChange}
							className="space-y-2"
						>
							{[
								{ v: 'si', label: 'Sí' },
								{ v: 'no', label: 'No' },
								{
									v: 'sci',
									label:
										'Quiero que Sotomayor Consulting International provea una dirección',
								},
							].map((opt) => (
								<label
									key={opt.v}
									className={cn(
										'flex cursor-pointer items-center gap-3 rounded-lg border-2 px-4 py-3 transition-all',
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
				<FieldError
					message={errors.direccionOperativaEEUU?.message as string}
				/>
			</fieldset>

			<OperativeAddressFields />
		</div>
	);
}
