import { AnimatePresence, motion } from 'framer-motion';
import { Icon } from '@iconify/react';
import { useEffect, useRef, useState } from 'react';
import type {
	UseFormGetValues,
	UseFormSetValue,
	Control,
} from 'react-hook-form';
import {
	Controller,
	useFieldArray,
	useFormContext,
	useWatch,
} from 'react-hook-form';

import { cn } from '@components/utils';
import { Checkbox } from '@components/ui/Checkbox';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@components/ui/Select';
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from '@components/ui/Tooltip';

import { Divider, Field, RadioCard, SectionHeader } from '../../../atoms';
import { createEmptyManager } from '../../../data/defaults';
import {
	defaultPublicValue,
	forcedPublicValue,
} from '../../../data/incorporation-rules';
import { useIncorporationRules } from '../../../data/incorporation-rules-context';
import type { CountryOption } from '../../../services/get-client-form-data';
import type { ClientFormData, Member } from '../../../types';
import { ManagerForm } from './ManagerForm';

/**
 * Pantalla 4 — Designación de manager + Responsable IRS.
 *
 * Dos caminos según `formaAdministracion`:
 *  A) Member-Managed → empty state útil con explicación + link para cambiar.
 *  B) Manager-Managed → flujo completo (SCI, manager es miembro, etc.).
 *
 * El **Responsable frente al IRS** se promueve como sección principal —
 * SIEMPRE aplica, independiente del modo de administración.
 *
 * Lógica preservada íntegramente.
 */
export function StepManager({ countries }: { countries: CountryOption[] }) {
	const { control, setValue, getValues } = useFormContext<ClientFormData>();

	const {
		fields: managerFields,
		append,
		remove,
	} = useFieldArray({ control, name: 'managers', keyName: '_key' });

	const [activeManagerTab, setActiveManagerTab] = useState(0);

	const formaAdministracion = useWatch<ClientFormData>({
		control,
		name: 'formaAdministracion',
	}) as string;
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
	const responsableIRS = useWatch<ClientFormData>({
		control,
		name: 'responsableIRS',
	}) as string;

	const showManagerSection = formaAdministracion === 'manager-managed';
	const showManagerForm =
		(managerEsMiembro === false || agregarOtrosSocios) && managerSCI === false;
	const eligibleMembers: Member[] = (miembros ?? []).filter(
		(m) => m?.nombreCompleto,
	);

	// Cuando el sub-formulario de manager deja de aplicar (se desmarca "añadir
	// otros socios", se vuelve a "el manager es un socio", SCI lo asigna, o se
	// cambia a member-managed) los managers agregados quedaban huérfanos en el
	// array y `managerSchema` los seguía validando — lo que rebotaba al usuario
	// de vuelta a este paso al avanzar. Limpiamos el array para mantener el
	// estado consistente con lo que el usuario ve.
	useEffect(() => {
		if (!showManagerForm && managerFields.length > 0) {
			setValue('managers', []);
			setActiveManagerTab(0);
		}
	}, [showManagerForm, managerFields.length, setValue]);
	// Solo personas naturales pueden ser responsables frente al IRS.
	const irsCandidates = eligibleMembers.filter(
		(m) => m.tipoSocio !== 'empresa',
	);
	const selectedResponsable = irsCandidates.find(
		(m) => m.id === responsableIRS,
	);

	// Si el responsable seleccionado dejó de ser elegible limpiamos la selección:
	//  · el socio fue eliminado en el paso anterior (ya no existe), o
	//  · pasó a ser tipo Empresa (una empresa no puede ser responsable IRS).
	// De lo contrario el id quedaba colgado y el refinement cross-step lo
	// rechazaba al enviar, rebotando al usuario de vuelta a este paso.
	useEffect(() => {
		if (!responsableIRS) return;
		const member = (miembros ?? []).find((m) => m?.id === responsableIRS);
		if (!member || member.tipoSocio === 'empresa') {
			setValue('responsableIRS', '');
		}
	}, [responsableIRS, miembros, setValue]);

	// Los managers elegidos entre los socios (`seleccionManagers`) guardan ids
	// de miembros. Si un socio seleccionado se elimina en el paso anterior, su
	// id quedaba huérfano en la lista — generando un manager que apunta a un
	// miembro inexistente en el submit. Lo depuramos contra los socios actuales.
	useEffect(() => {
		if (seleccionManagers.length === 0) return;
		const validIds = new Set((miembros ?? []).map((m) => m?.id));
		const pruned = seleccionManagers.filter((id) => validIds.has(id));
		if (pruned.length !== seleccionManagers.length) {
			setValue('seleccionManagers', pruned);
		}
	}, [seleccionManagers, miembros, setValue]);

	return (
		<>
			{showManagerSection ? (
				<ManagerManagedBranch
					control={control}
					setValue={setValue}
					getValues={getValues}
					managerSCI={managerSCI}
					managerEsMiembro={managerEsMiembro}
					agregarOtrosSocios={agregarOtrosSocios}
					seleccionManagers={seleccionManagers}
					eligibleMembers={eligibleMembers}
					managerFields={managerFields}
					append={append}
					remove={remove}
					activeManagerTab={activeManagerTab}
					setActiveManagerTab={setActiveManagerTab}
					showManagerForm={showManagerForm}
					countries={countries}
				/>
			) : (
				<MemberManagedEmptyState
					formaAdministracion={formaAdministracion}
					onChangeToManagerManaged={() =>
						setValue('formaAdministracion', 'manager-managed')
					}
				/>
			)}

			<Divider />

			{/* ═══════ Responsable frente al IRS — siempre visible ═══════ */}
			<SectionHeader
				kicker="Información adicional"
				title="Responsable frente al IRS"
				desc="Persona designada para responder por la entidad ante el Internal Revenue Service. Debe ser un socio persona natural (una empresa no puede ser responsable frente al IRS)."
			/>

			<div
				className="rounded-[14px] border p-5"
				style={{
					background: 'var(--cf-bg-card)',
					borderColor: 'var(--cf-line)',
				}}
			>
				<Controller
					control={control}
					name="responsableIRS"
					render={({ field }) => (
						<Field
							label="Socio responsable"
							hint="Será el contacto principal con el IRS para asuntos fiscales y declaraciones."
							required
						>
							<Select
								value={field.value}
								onValueChange={(v) => {
									field.onChange(v);
									field.onBlur();
								}}
							>
								<SelectTrigger className="w-full">
									<SelectValue placeholder="Selecciona un socio">
										{(value) => {
											const m = irsCandidates.find((x) => x.id === value);
											return m?.nombreCompleto || 'Selecciona un socio';
										}}
									</SelectValue>
								</SelectTrigger>
								<SelectContent>
									{irsCandidates.length === 0 ? (
										<div
											className="p-3 text-[12.5px] italic"
											style={{ color: 'var(--cf-ink-soft)' }}
										>
											{eligibleMembers.length === 0
												? 'Agrega socios en el paso anterior.'
												: 'Solo un socio persona natural puede ser responsable frente al IRS. Agrega uno en el paso anterior.'}
										</div>
									) : (
										irsCandidates.map((m) => {
											const idx = eligibleMembers.findIndex(
												(x) => x.id === m.id,
											);
											return (
												<SelectItem key={m.id} value={m.id}>
													{m.nombreCompleto} — Socio{' '}
													{String(idx + 1).padStart(2, '0')}
													{m.porcentaje ? ` · ${m.porcentaje}%` : ''}
												</SelectItem>
											);
										})
									)}
								</SelectContent>
							</Select>
						</Field>
					)}
				/>

				{selectedResponsable && (
					<div
						className="mt-4 flex items-center gap-3.5 rounded-[10px] border p-[14px_16px]"
						style={{
							background: 'var(--cf-accent-soft)',
							borderColor: 'var(--cf-accent-border)',
						}}
					>
						<div
							className="grid h-10 w-10 shrink-0 place-items-center rounded-full border text-[14px] font-semibold"
							style={{
								background: 'var(--cf-bg-card)',
								borderColor: 'var(--cf-accent-border)',
								color: 'var(--cf-accent-ink)',
							}}
						>
							{getInitials(selectedResponsable.nombreCompleto)}
						</div>
						<div className="min-w-0 flex-1">
							<div
								className="text-[13.5px] font-semibold tracking-[-0.005em]"
								style={{ color: 'var(--cf-ink)' }}
							>
								{selectedResponsable.nombreCompleto}
							</div>
							<div
								className="mt-0.5 text-[12px]"
								style={{ color: 'var(--cf-ink-mute)' }}
							>
								{[
									selectedResponsable.correo,
									selectedResponsable.numeroPasaporte &&
										`Pasaporte ${selectedResponsable.numeroPasaporte}`,
									selectedResponsable.nacionalidad,
								]
									.filter(Boolean)
									.join('  ·  ')}
							</div>
						</div>
						{selectedResponsable.porcentaje > 0 && (
							<span
								className="shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-medium"
								style={{
									background: 'var(--cf-bg-card)',
									borderColor: 'var(--cf-accent-border)',
									color: 'var(--cf-accent-ink)',
								}}
							>
								{selectedResponsable.porcentaje}% participación
							</span>
						)}
					</div>
				)}
			</div>
		</>
	);
}

function getInitials(name: string): string {
	const parts = name.trim().split(/\s+/);
	if (parts.length === 0) return '?';
	const first = parts[0]?.[0] ?? '';
	const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
	return (first + last).toUpperCase() || '?';
}

/* ═══════════════════════════════════════════════════════════════
   Empty state — Member-Managed
   ═══════════════════════════════════════════════════════════════ */
interface EmptyStateProps {
	formaAdministracion: string;
	onChangeToManagerManaged: () => void;
}

function MemberManagedEmptyState({
	formaAdministracion,
	onChangeToManagerManaged,
}: EmptyStateProps) {
	const isMember = formaAdministracion === 'member-managed';
	const isUndecided = !formaAdministracion;
	return (
		<div
			className="mb-7 flex items-start gap-4 rounded-[14px] border p-[18px_20px]"
			style={{
				background: 'var(--cf-bg-subtle)',
				borderColor: 'var(--cf-line)',
			}}
		>
			<div
				className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] border"
				style={{
					background: 'var(--cf-bg-card)',
					borderColor: 'var(--cf-line)',
				}}
			>
				<Icon
					icon="ri:user-settings-line"
					className="h-[18px] w-[18px]"
					style={{ color: 'var(--cf-ink)' }}
				/>
			</div>
			<div className="min-w-0">
				<div className="mb-1 flex items-center gap-2">
					<span
						className="text-[14px] font-semibold"
						style={{ color: 'var(--cf-ink)' }}
					>
						{isUndecided
							? 'Aún no has elegido el modo de administración'
							: 'No necesitas designar un manager'}
					</span>
					{isMember && (
						<span
							className="rounded-full border px-2 py-0.5 text-[11px] font-medium"
							style={{
								background: 'var(--cf-accent-soft)',
								borderColor: 'var(--cf-accent-border)',
								color: 'var(--cf-accent-ink)',
							}}
						>
							Member-Managed
						</span>
					)}
				</div>
				<div
					className="mb-2.5 text-[13px] leading-[1.55]"
					style={{ color: 'var(--cf-ink-mute)' }}
				>
					{isMember ? (
						<>
							Como elegiste{' '}
							<strong
								className="font-semibold"
								style={{ color: 'var(--cf-ink)' }}
							>
								Member-Managed
							</strong>{' '}
							en el paso anterior, todos los socios gestionan la empresa
							colectivamente. La configuración de manager solo aplica si
							seleccionas <em>Manager-Managed</em>.
						</>
					) : (
						<>
							Vuelve al paso anterior y selecciona una forma de administración.
						</>
					)}
				</div>
				{isMember && (
					<button
						type="button"
						onClick={onChangeToManagerManaged}
						className="border-b text-[12.5px] font-medium"
						style={{
							color: 'var(--cf-ink)',
							borderColor: 'var(--cf-line-strong)',
						}}
					>
						Cambiar a Manager-Managed →
					</button>
				)}
			</div>
		</div>
	);
}

/* ═══════════════════════════════════════════════════════════════
   Branch Manager-Managed — flujo completo (lógica intacta del original).
   ═══════════════════════════════════════════════════════════════ */
interface ManagerManagedProps {
	control: Control<ClientFormData>;
	setValue: UseFormSetValue<ClientFormData>;
	getValues: UseFormGetValues<ClientFormData>;
	managerSCI: boolean | null;
	managerEsMiembro: boolean | null;
	agregarOtrosSocios: boolean;
	seleccionManagers: string[];
	eligibleMembers: Member[];
	managerFields: Array<{ _key: string; id: string }>;
	append: (m: ReturnType<typeof createEmptyManager>) => void;
	remove: (index: number) => void;
	activeManagerTab: number;
	setActiveManagerTab: (i: number) => void;
	showManagerForm: boolean;
	countries: CountryOption[];
}

function ManagerManagedBranch({
	control,
	setValue,
	getValues,
	managerSCI,
	managerEsMiembro,
	agregarOtrosSocios: _agregarOtrosSocios,
	seleccionManagers,
	eligibleMembers,
	managerFields,
	append,
	remove,
	activeManagerTab,
	setActiveManagerTab,
	showManagerForm,
	countries,
}: ManagerManagedProps) {
	const { setValue: setFormValue, getFieldState } =
		useFormContext<ClientFormData>();

	// Regla de visibilidad de managers según el estado de incorporación.
	const { managerVisibility } = useIncorporationRules();
	const forcedManagerPublic = forcedPublicValue(managerVisibility);
	const defaultManagerPublic = defaultPublicValue(managerVisibility);
	const isManagerLocked = forcedManagerPublic !== null;
	const hasManagerReason = !!managerVisibility.reason;

	// Estado FUERZA la visibilidad → sincronizamos el valor.
	useEffect(() => {
		if (forcedManagerPublic !== null) {
			setFormValue('informacionManagersPublica', forcedManagerPublic, {
				shouldDirty: false,
			});
		}
	}, [forcedManagerPublic, setFormValue]);

	// Estado PRE-SELECCIONA (default-*) → aplicamos una vez si no fue modificado.
	const managerDefaultAppliedRef = useRef(false);
	useEffect(() => {
		if (defaultManagerPublic === null || managerDefaultAppliedRef.current)
			return;
		managerDefaultAppliedRef.current = true;
		if (!getFieldState('informacionManagersPublica').isDirty) {
			setFormValue('informacionManagersPublica', defaultManagerPublic, {
				shouldDirty: false,
			});
		}
	}, [defaultManagerPublic, getFieldState, setFormValue]);

	return (
		<div className="mb-7 flex flex-col gap-[22px]">
			<SectionHeader
				kicker="Configuración del manager"
				title="¿Quién gestionará la empresa?"
				desc="Como elegiste Manager-Managed, debes designar al menos un manager para representar la entidad."
			/>

			<Controller
				control={control}
				name="managerSCI"
				render={({ field }) => (
					<Field
						label="¿Desea que Sotomayor Consulting International asigne al Manager?"
						hint="Servicio disponible por $500 anuales."
					>
						<div className="flex gap-2.5">
							<RadioCard
								label="Sí, que SCI lo asigne"
								sub="Servicio por $500 anuales"
								selected={field.value === true}
								onClick={() => {
									field.onChange(true);
									setValue('managerEsMiembro', null);
									setValue('seleccionManagers', []);
									setValue('agregarOtrosSocios', false);
									setValue('managers', []);
								}}
							/>
							<RadioCard
								label="No, yo lo designo"
								sub="Selecciono o agrego al manager"
								selected={field.value === false}
								onClick={() => field.onChange(false)}
							/>
						</div>
					</Field>
				)}
			/>

			<AnimatePresence>
				{managerSCI === true && (
					<motion.div
						initial={{ opacity: 0, height: 0 }}
						animate={{ opacity: 1, height: 'auto' }}
						exit={{ opacity: 0, height: 0 }}
						className="overflow-hidden"
					>
						<div
							className="rounded-[10px] border p-4 text-[13px]"
							style={{
								background: 'var(--cf-accent-soft)',
								borderColor: 'var(--cf-accent-border)',
								color: 'var(--cf-accent-ink)',
							}}
						>
							<strong className="font-semibold">Nota:</strong> Sotomayor
							Consulting International será asignado como Manager de su LLC por
							un costo de $500 anuales.
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
						className="flex flex-col gap-[22px] overflow-hidden"
					>
						<Controller
							control={control}
							name="managerEsMiembro"
							render={({ field }) => (
								<Field label="¿El manager es parte de los miembros?">
									<div className="flex gap-2.5">
										<RadioCard
											label="Sí, es uno de los socios"
											selected={field.value === true}
											onClick={() => field.onChange(true)}
										/>
										<RadioCard
											label="No, designaré a otra persona"
											selected={field.value === false}
											onClick={() => {
												field.onChange(false);
												setValue('seleccionManagers', []);
												setValue('agregarOtrosSocios', false);
												if (getValues('managers').length === 0) {
													append(createEmptyManager());
												}
											}}
										/>
									</div>
								</Field>
							)}
						/>

						{managerEsMiembro === true && (
							<div className="flex flex-col gap-3">
								<div
									className="text-[13px] font-medium tracking-[-0.005em]"
									style={{ color: 'var(--cf-ink)' }}
								>
									Seleccione el/los miembro(s) que será(n) manager
								</div>
								<div className="flex flex-col gap-2">
									{eligibleMembers.length === 0 ? (
										<p
											className="text-[13px] italic"
											style={{ color: 'var(--cf-ink-soft)' }}
										>
											No hay miembros con nombre registrado. Complete la
											información de los socios primero.
										</p>
									) : (
										eligibleMembers.map((m) => {
											const checked = seleccionManagers.includes(m.id);
											return (
												<label
													key={m.id}
													className={cn(
														'flex cursor-pointer items-center gap-3 rounded-[10px] border-[1.5px] px-4 py-3 transition-all',
													)}
													style={{
														borderColor: checked
															? 'var(--cf-ink)'
															: 'var(--cf-line)',
														background: 'var(--cf-bg-card)',
													}}
												>
													<Checkbox
														checked={checked}
														onCheckedChange={(c) => {
															const list = getValues('seleccionManagers');
															if (c === true) {
																setValue('seleccionManagers', [...list, m.id]);
															} else {
																setValue(
																	'seleccionManagers',
																	list.filter((id) => id !== m.id),
																);
															}
														}}
													/>
													<span
														className="text-[14px]"
														style={{ color: 'var(--cf-ink)' }}
													>
														{m.nombreCompleto}
													</span>
												</label>
											);
										})
									)}
								</div>

								<label
									htmlFor="agregarOtrosSocios"
									className="flex cursor-pointer items-center gap-2 pt-1"
								>
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
									<span
										className="text-[13px]"
										style={{ color: 'var(--cf-ink-mute)' }}
									>
										Añadir otro(s) socio(s) fuera de la lista como manager
									</span>
								</label>
							</div>
						)}

						{showManagerForm && managerFields.length > 0 && (
							<div
								className="overflow-hidden rounded-[14px] border"
								style={{ borderColor: 'var(--cf-line)' }}
							>
								<div
									className="flex overflow-x-auto border-b"
									style={{
										background: 'var(--cf-bg-rail)',
										borderColor: 'var(--cf-line-soft)',
									}}
								>
									{managerFields.map((field, index) => {
										const name = getValues(`managers.${index}.nombre`);
										const firstName = name?.split(' ')[0];
										const isActive = activeManagerTab === index;
										return (
											<button
												key={field._key}
												type="button"
												onClick={() => setActiveManagerTab(index)}
												className="border-b-2 px-4 py-3 text-[13px] font-medium whitespace-nowrap transition-colors"
												style={{
													borderColor: isActive
														? 'var(--cf-ink)'
														: 'transparent',
													background: isActive
														? 'var(--cf-bg-card)'
														: 'transparent',
													color: isActive
														? 'var(--cf-ink)'
														: 'var(--cf-ink-soft)',
												}}
											>
												Manager {index + 1}
												{firstName && (
													<span
														className="ml-1.5 text-[11px]"
														style={{ color: 'var(--cf-ink-soft)' }}
													>
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
										className="flex items-center gap-1 px-4 py-3 text-[13px] font-medium"
										style={{ color: 'var(--cf-ink-soft)' }}
									>
										<Icon icon="ri:add-line" className="h-3.5 w-3.5" />
										Agregar
									</button>
								</div>
								<div className="p-5">
									{managerFields.map((field, index) => (
										<div
											key={field._key}
											className={cn(activeManagerTab !== index && 'hidden')}
										>
											<ManagerForm
												index={index}
												managerId={field.id}
												countries={countries}
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

						<Controller
							control={control}
							name="informacionManagersPublica"
							render={({ field }) => (
								<Field
									label={
										<span className="inline-flex items-center gap-1.5">
											¿Información de los managers pública o privada?
											{hasManagerReason && (
												<Tooltip>
													<TooltipTrigger
														render={
															<button
																type="button"
																className="inline-flex"
																style={{ color: 'var(--cf-ink-soft)' }}
																aria-label={
																	isManagerLocked
																		? 'Por qué está bloqueado'
																		: 'Más información'
																}
															>
																<Icon
																	icon={
																		isManagerLocked
																			? 'ri:lock-line'
																			: 'ri:information-line'
																	}
																	className="h-3.5 w-3.5"
																/>
															</button>
														}
													/>
													<TooltipContent className="max-w-xs">
														{managerVisibility.reason}
													</TooltipContent>
												</Tooltip>
											)}
										</span>
									}
								>
									<div
										className={cn(
											'flex gap-2.5',
											isManagerLocked && 'pointer-events-none opacity-60',
										)}
										aria-disabled={isManagerLocked}
									>
										<RadioCard
											label="Pública"
											sub="Visible en registros del estado"
											selected={field.value === true}
											onClick={() => !isManagerLocked && field.onChange(true)}
										/>
										<RadioCard
											label="Privada"
											sub="No se publica en registros estatales"
											selected={field.value === false}
											onClick={() => !isManagerLocked && field.onChange(false)}
										/>
									</div>
								</Field>
							)}
						/>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}
