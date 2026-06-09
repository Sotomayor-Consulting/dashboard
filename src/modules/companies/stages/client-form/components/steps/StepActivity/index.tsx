import { Icon } from '@iconify/react';
import { useEffect } from 'react';
import { Controller, useFormContext, useWatch } from 'react-hook-form';

import { Checkbox } from '@components/ui/Checkbox';
import { Textarea } from '@components/ui/Textarea';
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from '@components/ui/Tooltip';

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

	const ingresosEEUU = useWatch<ClientFormData>({
		control,
		name: 'ingresosEEUU',
	}) as boolean | undefined;

	// Si tiene ingresos de fuente americana → forzar dirección en EE.UU.
	useEffect(() => {
		if (ingresosEEUU === true) {
			setValue('direccionOperativaEEUU', 'si');
		}
	}, [ingresosEEUU, setValue]);

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
									sub="Operaré fuera de EE. UU."
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
							<label
								htmlFor="actividadNoEnLista"
								className="mt-2 inline-flex cursor-pointer items-center gap-1.5 text-[12px]"
								style={{ color: 'var(--cf-ink-soft)' }}
							>
								<Controller
									control={control}
									name="actividadNoEnLista"
									render={({ field: cb }) => (
										<Checkbox
											id="actividadNoEnLista"
											checked={cb.value}
											onCheckedChange={(checked) => {
												cb.onChange(checked === true);
												if (checked) setValue('actividad', '');
											}}
										/>
									)}
								/>
								No encuentro mi actividad en la lista
							</label>
						</Field>
					)}
				/>

				<Field
					label="Describa su giro de negocio"
					hint="El IRS y los bancos lo usan para entender tu actividad. Sé claro y específico."
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
					{actividadNoEnLista && (
						<div
							className="mt-1.5 flex items-start gap-1.5 text-[11.5px] leading-[1.5]"
							style={{ color: 'var(--cf-accent-ink)' }}
						>
							<Icon
								icon="ri:information-line"
								className="mt-0.5 h-3.5 w-3.5 shrink-0"
							/>
							Como tu actividad no está en la lista, descríbela con el mayor
							detalle posible: nuestro equipo asignará el código IRS
							correspondiente.
						</div>
					)}
				</Field>
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
							<div className="flex flex-col gap-2.5 sm:flex-row">
								<RadioCard
									label="Entidad de paso (Pass-Through)"
									sub="Los ingresos se reportan en la declaración personal de cada socio. Clasificación por defecto de la LLC (disregarded o partnership)."
									selected={field.value === 'pass-through'}
									onClick={() => field.onChange('pass-through')}
								/>
								<RadioCard
									label="Corporación (Corporation)"
									sub="La LLC tributa como entidad propia. Útil para reinvertir utilidades o tener inversionistas externos."
									selected={field.value === 'corporation'}
									onClick={() => field.onChange('corporation')}
								/>
							</div>
							{formaTributacion === 'corporation' && (
								<div
									className="mt-2.5 flex items-start gap-2 rounded-lg border p-3 text-[12px] leading-[1.5]"
									style={{
										background: 'var(--cf-warn-soft)',
										borderColor: 'var(--cf-line-soft)',
										color: 'var(--cf-ink-mute)',
									}}
								>
									<Icon
										icon="ri:information-line"
										className="mt-0.5 h-3.5 w-3.5 shrink-0"
										style={{ color: 'var(--cf-warn)' }}
									/>
									<span>
										Para tributar como corporación, la LLC debe presentar el{' '}
										<strong style={{ color: 'var(--cf-ink)' }}>
											Formulario 8832 (Entity Classification Election)
										</strong>{' '}
										ante el IRS y elegir expresamente ser tratada como
										corporación; de lo contrario, por defecto tributa como
										entidad de paso. Ten en cuenta que esta elección no puede
										modificarse durante los 60 meses siguientes sin autorización
										del IRS.
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
				desc="Indicanos la dirección desde donde opera tu empresa."
			/>

			<Controller
				control={control}
				name="direccionOperativaEEUU"
				render={({ field }) => (
					<Field
						label={
							<span className="inline-flex items-center gap-1.5">
								¿Tienes una dirección en EE. UU.?
								{ingresosEEUU === true && (
									<Tooltip>
										<TooltipTrigger
											render={
												<button
													type="button"
													className="inline-flex"
													style={{ color: 'var(--cf-ink-soft)' }}
													aria-label="Más información"
												>
													<Icon
														icon="ri:information-line"
														className="h-3.5 w-3.5"
													/>
												</button>
											}
										/>
										<TooltipContent className="max-w-xs">
											Al indicar que tu LLC obtiene ingresos de fuente
											estadounidense, es necesario contar con una dirección
											operativa en EE.&nbsp;UU.
										</TooltipContent>
									</Tooltip>
								)}
							</span>
						}
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
								disabled={ingresosEEUU === true}
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
