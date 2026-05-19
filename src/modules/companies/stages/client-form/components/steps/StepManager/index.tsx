import { AnimatePresence, motion } from 'framer-motion';
import { Icon } from '@iconify/react';
import { useState } from 'react';
import {
	Controller,
	useFieldArray,
	useFormContext,
	useWatch,
} from 'react-hook-form';

import { cn } from '@components/utils';
import { Checkbox } from '@components/ui/Checkbox';
import { Label } from '@components/ui/Label';
import { RadioGroup, RadioGroupItem } from '@components/ui/RadioGroup';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@components/ui/Select';

import { createEmptyManager } from '../../../data/defaults';
import type { ClientFormData } from '../../../types';
import { FieldTooltip } from '../../shared/FieldTooltip';
import { YesNoRadio } from '../../shared/YesNoRadio';
import { ManagerForm } from './ManagerForm';

export function StepManager() {
	const { control, setValue, getValues } = useFormContext<ClientFormData>();

	const {
		fields: managerFields,
		append,
		remove,
	} = useFieldArray({ control, name: 'managers', keyName: '_key' });

	const [activeManagerTab, setActiveManagerTab] = useState(0);

	// Cross-field watching
	const formaAdministracion = useWatch<ClientFormData>({
		control,
		name: 'formaAdministracion',
	}) as ClientFormData['formaAdministracion'];
	const managerSCI = useWatch<ClientFormData>({
		control,
		name: 'managerSCI',
	}) as boolean | null;
	const managerEsMiembro = useWatch<ClientFormData>({
		control,
		name: 'managerEsMiembro',
	}) as boolean | null;
	const agregarOtrosSocios = useWatch<ClientFormData>({
		control,
		name: 'agregarOtrosSocios',
	}) as boolean;
	const seleccionManagers = useWatch<ClientFormData>({
		control,
		name: 'seleccionManagers',
	}) as string[];
	const miembros = useWatch<ClientFormData>({ control, name: 'miembros' }) as
		| ClientFormData['miembros']
		| undefined;

	const showManagerSection = formaAdministracion === 'member-managed';
	const showManagerForm =
		(managerEsMiembro === false || agregarOtrosSocios) && managerSCI === false;

	const eligibleMembers = (miembros ?? []).filter((m) => m?.nombreCompleto);

	return (
		<div className="space-y-6">
			<div>
				<h2 className="text-foreground text-2xl font-semibold">
					Información de manager
				</h2>
				<p className="text-muted-foreground mt-1">
					Configuración de la administración de la LLC.
				</p>
			</div>

			{showManagerSection ? (
				<div className="space-y-6">
					{/* SCI asigna manager */}
					<fieldset className="space-y-3">
						<legend className="text-foreground text-sm font-medium">
							¿Desea que Sotomayor Consulting International asigne al Manager?
							<FieldTooltip text="Servicio disponible por $500 anuales." />
						</legend>
						<Controller
							control={control}
							name="managerSCI"
							render={({ field }) => (
								<YesNoRadio
									value={field.value}
									onChange={(v) => {
										field.onChange(v);
										if (v === true) {
											setValue('managerEsMiembro', null);
											setValue('seleccionManagers', []);
											setValue('agregarOtrosSocios', false);
											setValue('managers', []);
										}
									}}
								/>
							)}
						/>
					</fieldset>

					<AnimatePresence>
						{managerSCI === true && (
							<motion.div
								initial={{ opacity: 0, height: 0 }}
								animate={{ opacity: 1, height: 'auto' }}
								exit={{ opacity: 0, height: 0 }}
							>
								<div className="bg-accent/10 border-accent/20 rounded-lg border p-4">
									<p className="text-foreground text-sm">
										<strong>Nota:</strong> Sotomayor Consulting International
										será asignado como Manager de su LLC por un costo de $500
										anuales.
									</p>
								</div>
							</motion.div>
						)}
					</AnimatePresence>

					<AnimatePresence>
						{managerSCI === false && (
							<motion.div
								initial={{ opacity: 0, height: 0 }}
								animate={{ opacity: 1, height: 'auto' }}
								exit={{ opacity: 0, height: 0 }}
								className="space-y-6"
							>
								<fieldset className="space-y-3">
									<legend className="text-foreground text-sm font-medium">
										¿El manager es parte de los miembros?
									</legend>
									<Controller
										control={control}
										name="managerEsMiembro"
										render={({ field }) => (
											<YesNoRadio
												value={field.value}
												onChange={(v) => {
													field.onChange(v);
													if (v === false) {
														setValue('seleccionManagers', []);
														setValue('agregarOtrosSocios', false);
														if (getValues('managers').length === 0) {
															append(createEmptyManager());
														}
													}
												}}
											/>
										)}
									/>
								</fieldset>

								{managerEsMiembro === true && (
									<div className="space-y-4">
										<div>
											<Label className="text-sm font-medium">
												Seleccione el/los miembro(s) que será(n) manager
											</Label>
											<div className="mt-2 space-y-2">
												{eligibleMembers.map((m) => {
													const checked = seleccionManagers.includes(m.id);
													return (
														<label
															key={m.id}
															className={cn(
																'flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 transition-all',
																checked
																	? 'border-accent bg-accent/5'
																	: 'border-border hover:border-accent/50',
															)}
														>
															<Checkbox
																checked={checked}
																onCheckedChange={(c) => {
																	const list = getValues('seleccionManagers');
																	if (c === true) {
																		setValue('seleccionManagers', [
																			...list,
																			m.id,
																		]);
																	} else {
																		setValue(
																			'seleccionManagers',
																			list.filter((id) => id !== m.id),
																		);
																	}
																}}
															/>
															<span>{m.nombreCompleto}</span>
														</label>
													);
												})}
												{eligibleMembers.length === 0 && (
													<p className="text-muted-foreground text-sm italic">
														No hay miembros con nombre registrado. Complete la
														información de los socios primero.
													</p>
												)}
											</div>
										</div>

										<div className="flex items-center gap-2">
											<Controller
												control={control}
												name="agregarOtrosSocios"
												render={({ field }) => (
													<Checkbox
														id="agregarOtrosSocios"
														checked={field.value}
														onCheckedChange={(c) => {
															const next = c === true;
															field.onChange(next);
															if (next && getValues('managers').length === 0) {
																append(createEmptyManager());
															}
														}}
													/>
												)}
											/>
											<label
												htmlFor="agregarOtrosSocios"
												className="cursor-pointer text-sm"
											>
												Añadir otro(s) socio(s) fuera de la lista como manager
											</label>
										</div>
									</div>
								)}

								{showManagerForm && managerFields.length > 0 && (
									<div className="border-border overflow-hidden rounded-xl border">
										<div className="bg-muted/30 border-border flex overflow-x-auto border-b">
											{managerFields.map((field, index) => {
												const name = getValues(`managers.${index}.nombre`);
												const firstName = name?.split(' ')[0];
												return (
													<button
														key={field._key}
														type="button"
														onClick={() => setActiveManagerTab(index)}
														className={cn(
															'border-b-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors',
															activeManagerTab === index
																? 'border-accent text-accent bg-card'
																: 'border-transparent text-muted-foreground hover:text-foreground',
														)}
													>
														Manager {index + 1}
														{firstName && (
															<span className="text-muted-foreground ml-1.5 text-xs">
																({firstName})
															</span>
														)}
													</button>
												);
											})}
											<button
												type="button"
												onClick={() => {
													append(createEmptyManager());
													setActiveManagerTab(managerFields.length);
												}}
												className="text-muted-foreground hover:text-accent flex items-center gap-1 px-4 py-3 text-sm font-medium"
											>
												<Icon icon="ri:add-line" className="h-4 w-4" />
												Agregar
											</button>
										</div>

										<div className="p-4 md:p-6">
											{managerFields.map((field, index) => (
												<div
													key={field._key}
													className={cn(
														activeManagerTab !== index && 'hidden',
													)}
												>
													<ManagerForm
														index={index}
														managerId={field.id}
														canRemove={managerFields.length > 1}
														onRemove={() => {
															remove(index);
															setActiveManagerTab(
																Math.max(0, activeManagerTab - 1),
															);
														}}
													/>
												</div>
											))}
										</div>
									</div>
								)}

								{/* Privacidad managers */}
								<fieldset className="space-y-3">
									<legend className="text-foreground text-sm font-medium">
										¿Desea que la información de los managers sea pública o
										privada?
									</legend>
									<Controller
										control={control}
										name="informacionManagersPublica"
										render={({ field }) => (
											<RadioGroup
												value={field.value ? 'publica' : 'privada'}
												onValueChange={(v) => field.onChange(v === 'publica')}
												className="flex gap-4"
											>
												{[
													{
														v: 'publica',
														label: 'Pública',
														active: field.value,
													},
													{
														v: 'privada',
														label: 'Privada',
														active: !field.value,
													},
												].map((opt) => (
													<label
														key={opt.v}
														className={cn(
															'flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2 transition-all',
															opt.active
																? 'border-accent bg-accent/5'
																: 'border-border hover:border-accent/50',
														)}
													>
														<RadioGroupItem value={opt.v} />
														<span className="text-sm">{opt.label}</span>
													</label>
												))}
											</RadioGroup>
										)}
									/>
								</fieldset>
							</motion.div>
						)}
					</AnimatePresence>
				</div>
			) : (
				<div className="bg-muted/50 rounded-lg p-6 text-center">
					<Icon
						icon="ri:user-settings-line"
						className="text-muted-foreground mx-auto mb-3 h-12 w-12"
					/>
					<p className="text-muted-foreground">
						La configuración de manager solo aplica cuando selecciona{' '}
						<strong>Member-Managed</strong> como forma de administración.
					</p>
					<p className="text-muted-foreground mt-2 text-sm">
						Actualmente tiene seleccionado:{' '}
						<strong>
							{formaAdministracion === 'manager-managed'
								? 'Manager-Managed'
								: formaAdministracion
									? 'Member-Managed'
									: 'Sin seleccionar'}
						</strong>
					</p>
				</div>
			)}

			{/* Información adicional */}
			<div className="border-border space-y-6 border-t pt-6">
				<h3 className="text-foreground font-medium">Información adicional</h3>
				<div>
					<Label className="text-sm font-medium">
						Responsable frente al IRS
						<FieldTooltip text="Persona que el IRS puede contactar para cuestiones fiscales. Debe ser el socio principal." />
					</Label>
					<Controller
						control={control}
						name="responsableIRS"
						render={({ field }) => (
							<Select value={field.value} onValueChange={field.onChange}>
								<SelectTrigger className="mt-2 w-full">
									<SelectValue placeholder="Selecciona un socio" />
								</SelectTrigger>
								<SelectContent>
									{eligibleMembers.map((m) => (
										<SelectItem key={m.id} value={m.id}>
											{m.nombreCompleto}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						)}
					/>
				</div>
			</div>
		</div>
	);
}
