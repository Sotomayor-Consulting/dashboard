import { AnimatePresence, motion } from 'framer-motion';
import { Icon } from '@iconify/react';
import { Controller, useFormContext, useWatch } from 'react-hook-form';

import { Button } from '@components/ui/Button';
import { Checkbox } from '@components/ui/Checkbox';
import { Input } from '@components/ui/Input';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@components/ui/Select';
import { Textarea } from '@components/ui/Textarea';

import { Divider, Field, RadioCard, SectionHeader } from '../../../atoms';
import type { Activity } from '../../../data/activities';
import type { ClientFormData } from '../../../types';
import { ActivityPicker } from '../../shared/ActivityPicker';
import { OperativeAddressFields } from './OperativeAddressFields';

interface Props {
	activities: Activity[];
}

/**
 * Pantalla 2 — Actividad / Información general.
 *
 * 3 sub-secciones con kicker mono:
 *   A · Operación               — ingresos EE.UU., actividad, descripción
 *   B · Administración y trib.  — Manager/Member, tax classification
 *   C · Ubicación operativa     — dirección con bloque condicional anidado
 *
 * **LÓGICA INTACTA:** validaciones zod, condicional `actividadNoEnLista`,
 * conditional rendering del bloque de dirección — todo se mantiene.
 * Solo cambia la UI (kickers, RadioCard nuevos, dividers, info bubble).
 */
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

	const formaTributacion = useWatch<ClientFormData>({
		control,
		name: 'formaTributacion',
	}) as string;

	return (
		<>
			{/* ═══════ A · OPERACIÓN ═══════ */}
			<SectionHeader
				kicker="A · Operación"
				title="Operación e industria"
				desc="Ayúdanos a entender cómo va a operar tu empresa en EE. UU."
			/>

			<div className="flex flex-col gap-[22px]">
				<Controller
					control={control}
					name="ingresosEEUU"
					render={({ field }) => (
						<Field
							label="¿Tu LLC obtendrá ingresos provenientes de Estados Unidos?"
							hint="Marca Sí si tu LLC facturará a clientes ubicados en EE. UU."
							required
							error={errors.ingresosEEUU?.message as string | undefined}
						>
							<div className="flex gap-2.5">
								<RadioCard
									label="Sí"
									sub="Facturaré a clientes en EE. UU."
									selected={field.value === true}
									onClick={() => field.onChange(true)}
								/>
								<RadioCard
									label="No"
									sub="Solo opero fuera de EE. UU."
									selected={field.value === false}
									onClick={() => field.onChange(false)}
								/>
							</div>
						</Field>
					)}
				/>

				<Controller
					control={control}
					name="actividad"
					render={({ field }) => (
						<Field
							label="Actividad económica"
							hint="Selecciona primero el sector, luego la categoría y finalmente la actividad específica."
							required
							error={errors.actividad?.message as string | undefined}
						>
							<ActivityPicker
								activities={activities}
								value={field.value}
								onChange={(id) => {
									field.onChange(id);
									if (id) setValue('actividadNoEnLista', false);
								}}
								disabled={actividadNoEnLista}
							/>
						</Field>
					)}
				/>

				<Field
					label="Describa su negocio"
					hint="Una o dos oraciones. El IRS y los bancos lo usan para entender tu actividad."
					required
					htmlFor="descripcionActividad"
					error={errors.descripcionActividad?.message as string | undefined}
				>
					<Textarea
						id="descripcionActividad"
						{...register('descripcionActividad')}
						placeholder="Ej: Ofrecemos servicios de consultoría en tecnología de la información a pequeñas y medianas empresas en EE. UU…"
						rows={3}
						className="!border-[var(--cf-line)] !bg-[var(--cf-bg-card)]"
					/>
					<div
						className="mt-1.5 flex items-center justify-between text-[11.5px]"
						style={{ color: 'var(--cf-ink-soft)' }}
					>
						<label
							htmlFor="actividadNoEnLista"
							className="inline-flex cursor-pointer items-center gap-1.5"
						>
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
							Mi actividad no está en la lista
						</label>
					</div>
				</Field>

				{/* Código IRS — solo si "no está en lista" */}
				<AnimatePresence>
					{actividadNoEnLista && (
						<motion.div
							initial={{ opacity: 0, height: 0 }}
							animate={{ opacity: 1, height: 'auto' }}
							exit={{ opacity: 0, height: 0 }}
							className="overflow-hidden"
						>
							<div
								className="rounded-[10px] border p-4"
								style={{
									background: 'var(--cf-bg-subtle)',
									borderColor: 'var(--cf-line-soft)',
								}}
							>
								<Field
									label="Código IRS de la actividad"
									hint="Ingresa el código de la actividad según el IRS."
									htmlFor="codigoActividad"
									error={errors.codigoActividad?.message as string | undefined}
								>
									<div className="flex gap-2">
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
								</Field>
							</div>
						</motion.div>
					)}
				</AnimatePresence>
			</div>

			<Divider />

			{/* ═══════ B · ADMINISTRACIÓN Y TRIBUTACIÓN ═══════ */}
			<SectionHeader
				kicker="B · Administración y tributación"
				title="¿Cómo se administra y tributa la empresa?"
				desc="Esto determina cómo se gestionan las decisiones y cómo declara impuestos."
			/>

			<div className="flex flex-col gap-[22px]">
				<Controller
					control={control}
					name="formaAdministracion"
					render={({ field }) => (
						<Field
							label="Forma de administración"
							required
							error={errors.formaAdministracion?.message as string | undefined}
						>
							<div className="flex gap-2.5">
								<RadioCard
									label="Manager-Managed"
									sub="Una persona designada gestiona la empresa"
									selected={field.value === 'manager-managed'}
									onClick={() => field.onChange('manager-managed')}
								/>
								<RadioCard
									label="Member-Managed"
									sub="Todos los socios gestionan la empresa"
									selected={field.value === 'member-managed'}
									onClick={() => field.onChange('member-managed')}
								/>
							</div>
						</Field>
					)}
				/>

				<Controller
					control={control}
					name="formaTributacion"
					render={({ field }) => (
						<Field
							label="Forma de tributar / Tax Classification"
							hint="Depende de la cantidad de socios y de tu estrategia fiscal."
							required
							htmlFor="formaTributacion"
							error={errors.formaTributacion?.message as string | undefined}
						>
							<Select
								value={field.value}
								onValueChange={field.onChange}
							>
								<SelectTrigger className="w-full">
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
							{formaTributacion && (
								<div
									className="mt-2 flex items-start gap-2 rounded-lg border p-2.5 text-[12px]"
									style={{
										background: 'var(--cf-bg-subtle)',
										borderColor: 'var(--cf-line-soft)',
										color: 'var(--cf-ink-mute)',
									}}
								>
									<Icon
										icon="ri:information-line"
										className="mt-0.5 h-3.5 w-3.5 shrink-0"
										style={{ color: 'var(--cf-ink-soft)' }}
									/>
									<span>
										{formaTributacion === 'pass-through'
											? 'Apropiado cuando los ingresos se reportan en el formulario personal del socio. Común para LLCs de un solo miembro.'
											: 'La empresa tributa como entidad propia (corp). Útil si planeas reinvertir utilidades o tener inversionistas externos.'}
									</span>
								</div>
							)}
						</Field>
					)}
				/>
			</div>

			<Divider />

			{/* ═══════ C · UBICACIÓN OPERATIVA ═══════ */}
			<SectionHeader
				kicker="C · Ubicación operativa"
				title="Dirección en Estados Unidos"
				desc="Si no tienes una aún, podemos proveerte una dirección registrada."
			/>

			<Controller
				control={control}
				name="direccionOperativaEEUU"
				render={({ field }) => (
					<Field
						label="¿Tienes una dirección operativa en EE. UU.?"
						required
						error={errors.direccionOperativaEEUU?.message as string | undefined}
					>
						<div className="flex flex-col gap-2.5">
							<RadioCard
								label="Sí, tengo una dirección"
								selected={field.value === 'si'}
								onClick={() => field.onChange('si')}
							/>
							<RadioCard
								label="No, todavía no tengo dirección"
								selected={field.value === 'no'}
								onClick={() => field.onChange('no')}
							/>
							<RadioCard
								label="Quiero que Sotomayor Consulting me provea una"
								selected={field.value === 'sci'}
								onClick={() => field.onChange('sci')}
							/>
						</div>
					</Field>
				)}
			/>

			{/* Bloque anidado con border-left visible cuando aplica */}
			<div
				className="mt-4 ml-[18px] border-l-2 pl-[22px]"
				style={{ borderColor: 'var(--cf-line)' }}
			>
				<OperativeAddressFields />
			</div>
		</>
	);
}
