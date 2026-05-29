import { Icon } from '@iconify/react';
import { useEffect, useRef, useState } from 'react';
import {
	Controller,
	useFieldArray,
	useFormContext,
	useWatch,
} from 'react-hook-form';

import { Button } from '@components/ui/Button';
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from '@components/ui/Tooltip';

import { KickerLabel, SegmentedControl } from '../../../atoms';
import { createEmptyMember } from '../../../data/defaults';
import {
	defaultPublicValue,
	forcedPublicValue,
} from '../../../data/incorporation-rules';
import { useIncorporationRules } from '../../../data/incorporation-rules-context';
import type { ClientFormData, Member } from '../../../types';
import { MemberAddressSection } from './sections/MemberAddressSection';
import { MemberDocumentsSection } from './sections/MemberDocumentsSection';
import { MemberIdentitySection } from './sections/MemberIdentitySection';
import { MemberParticipationSection } from './sections/MemberParticipationSection';
import { getMemberCompletion } from './sections/member-status';
import { AddSocioButton, SocioPill } from './SocioPill';

type SubsectionKey = 'A' | 'B' | 'C' | 'D';

/**
 * Pantalla 3 — Miembros (rediseñada).
 *
 * Master-detail:
 *   - Header row: descripción + segmented control Pública/Privada
 *   - Pills horizontales de socios + botón dashed agregar
 *   - Detail del socio activo: 4 SubsectionCards A/B/C/D colapsables
 *   - Botón "Eliminar socio" abajo (solo si hay > 1)
 *
 * El footer con la barra de % asignado se renderiza desde el wizard
 * padre (footer custom del FormShell).
 *
 * **Lógica intacta:** useFieldArray, validación 100%, condicional
 * SSN/ITIN según residente fiscal, upload archivos, privacidad.
 */
export function StepMembers() {
	const { control, setValue, getFieldState } =
		useFormContext<ClientFormData>();
	const { fields, append, remove } = useFieldArray({
		control,
		name: 'miembros',
		keyName: '_key',
	});

	// Regla de visibilidad de socios según el estado de incorporación.
	const { membersVisibility } = useIncorporationRules();
	const forcedPublic = forcedPublicValue(membersVisibility);
	const defaultPublic = defaultPublicValue(membersVisibility);
	const isLocked = forcedPublic !== null;
	const hasReason = !!membersVisibility.reason;

	// Si el estado FUERZA la visibilidad, sincronizamos el valor del form.
	useEffect(() => {
		if (forcedPublic !== null) {
			setValue('informacionMiembrosPublica', forcedPublic, {
				shouldDirty: false,
			});
		}
	}, [forcedPublic, setValue]);

	// Si el estado PRE-SELECCIONA (default-*) aplicamos el valor una sola vez,
	// solo si el cliente no lo ha modificado. Así puede cambiarlo libremente.
	const defaultAppliedRef = useRef(false);
	useEffect(() => {
		if (defaultPublic === null || defaultAppliedRef.current) return;
		defaultAppliedRef.current = true;
		const dirty = getFieldState('informacionMiembrosPublica').isDirty;
		if (!dirty) {
			setValue('informacionMiembrosPublica', defaultPublic, {
				shouldDirty: false,
			});
		}
	}, [defaultPublic, getFieldState, setValue]);

	const [activeIdx, setActiveIdx] = useState(0);
	const [openSection, setOpenSection] = useState<SubsectionKey | null>('A');

	const toggleSection = (key: SubsectionKey) =>
		setOpenSection((prev) => (prev === key ? null : key));

	const watched = useWatch<ClientFormData>({ control, name: 'miembros' }) as
		| Member[]
		| undefined;
	const members = watched ?? [];

	const activeIndex = Math.min(activeIdx, fields.length - 1);
	const activeField = fields[activeIndex];

	return (
		<>
			{/* Header row */}
			<div className="mb-[22px] flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
				<p
					className="m-0 max-w-[540px] text-[14px] leading-[1.55]"
					style={{ color: 'var(--cf-ink-mute)' }}
				>
					Agrega cada uno de los socios de la LLC. La suma de porcentajes
					debe ser{' '}
					<strong
						className="font-semibold"
						style={{ color: 'var(--cf-ink)' }}
					>
						exactamente 100%
					</strong>
					.
				</p>
				<div className="flex flex-col items-end gap-1.5">
					<div className="flex items-center gap-1.5 self-end">
						<KickerLabel>Visibilidad</KickerLabel>
						{hasReason && (
							<Tooltip>
								<TooltipTrigger
									render={
										<button
											type="button"
											className="inline-flex"
											style={{ color: 'var(--cf-ink-soft)' }}
											aria-label={
												isLocked
													? 'Por qué está bloqueado'
													: 'Más información'
											}
										>
											<Icon
												icon={isLocked ? 'ri:lock-line' : 'ri:information-line'}
												className="h-3.5 w-3.5"
											/>
										</button>
									}
								/>
								<TooltipContent className="max-w-xs">
									{membersVisibility.reason}
								</TooltipContent>
							</Tooltip>
						)}
					</div>
					<Controller
						control={control}
						name="informacionMiembrosPublica"
						render={({ field }) => (
							<SegmentedControl
								value={field.value ? 'publica' : 'privada'}
								onChange={(v) => field.onChange(v === 'publica')}
								disabled={isLocked}
								options={[
									{ value: 'publica', label: 'Pública' },
									{ value: 'privada', label: 'Privada' },
								]}
							/>
						)}
					/>
				</div>
			</div>

			{/* Pills + agregar */}
			<div className="mb-6 flex flex-wrap items-stretch gap-2.5">
				{fields.map((field, idx) => {
					const m = members[idx];
					const { completed, total, status } = getMemberCompletion(m);
					return (
						<SocioPill
							key={field._key}
							num={idx + 1}
							name={m?.nombreCompleto ?? ''}
							percentage={m?.porcentaje ?? 0}
							status={status}
							pendingCount={total - completed}
							active={idx === activeIndex}
							onClick={() => {
								setActiveIdx(idx);
								setOpenSection('A');
							}}
						/>
					);
				})}
				<AddSocioButton
					onClick={() => {
						append(createEmptyMember());
						setActiveIdx(fields.length);
						setOpenSection('A');
					}}
				/>
			</div>

			{/* Detalle del socio activo */}
			{activeField && activeIndex >= 0 && (
				<div className="flex flex-col gap-3">
					<MemberIdentitySection
						index={activeIndex}
						memberId={activeField.id}
						open={openSection === 'A'}
						onToggle={() => toggleSection('A')}
					/>
					<MemberParticipationSection
						index={activeIndex}
						open={openSection === 'B'}
						onToggle={() => toggleSection('B')}
					/>
					<MemberDocumentsSection
						index={activeIndex}
						memberId={activeField.id}
						open={openSection === 'C'}
						onToggle={() => toggleSection('C')}
					/>
					<MemberAddressSection
						index={activeIndex}
						memberId={activeField.id}
						open={openSection === 'D'}
						onToggle={() => toggleSection('D')}
					/>

					{fields.length > 1 && (
						<div
							className="mt-2 flex justify-end border-t pt-4"
							style={{ borderColor: 'var(--cf-line)' }}
						>
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={() => {
									remove(activeIndex);
									setActiveIdx(Math.max(0, activeIndex - 1));
									setOpenSection('A');
								}}
								className="gap-1.5"
								style={{
									color: 'var(--cf-danger)',
									borderColor: 'var(--cf-danger-border)',
								}}
							>
								<Icon icon="ri:delete-bin-line" className="h-3.5 w-3.5" />
								Eliminar socio
							</Button>
						</div>
					)}
				</div>
			)}
		</>
	);
}
