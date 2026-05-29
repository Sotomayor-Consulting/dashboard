import { Icon } from '@iconify/react';
import { Controller, useFormContext, useWatch } from 'react-hook-form';

import { Checkbox } from '@components/ui/Checkbox';

import { Divider, SectionHeader } from '../../../atoms';
import type { Activity } from '../../../data/activities';
import type { ClientFormData, StepId } from '../../../types';
import { FieldError } from '../../shared/FieldError';
import { SignaturePadField } from './SignaturePadField';
import { SummaryPanel } from './SummaryPanel';

interface Props {
	activities: Activity[];
	/** Callback opcional para editar pasos previos desde las SummaryCards. */
	onEditStep?: ((step: StepId) => void) | undefined;
}

/**
 * Pantalla 5 — Confirmación y firma.
 *
 * Estructura:
 *   1. Hero copy
 *   2. SummaryPanel (3 cards: Info, Miembros, Manager) con botón Editar→goTo
 *   3. SectionHeader "Firma digital" + SignaturePadField (intacto)
 *   4. Divider
 *   5. Términos card destacada (border ink 1.5) con checkbox + timestamp
 *
 * **Lógica intacta:** captura de firma (tabs Dibujar/Escribir/Subir),
 * validación del checkbox de términos antes del submit.
 */
export function StepConfirmation({ activities, onEditStep }: Props) {
	const {
		control,
		formState: { errors },
	} = useFormContext<ClientFormData>();

	const aceptaTerminos = useWatch<ClientFormData>({
		control,
		name: 'aceptaTerminos',
	}) as boolean;

	const acceptedAt = useTermsTimestamp(aceptaTerminos);

	return (
		<>
			{/* Hero */}
			<p
				className="m-0 mb-6 max-w-[620px] text-[14px] leading-[1.55]"
				style={{ color: 'var(--cf-ink-mute)' }}
			>
				Verifica que toda la información sea correcta. Después de enviar,
				recibirás una copia firmada por correo y nuestro equipo se comunicará
				en menos de 24 horas.
			</p>

			{/* Resumen — 3 cards */}
			<SummaryPanel activities={activities} onEditStep={onEditStep} />

			{/* Firma digital */}
			<SectionHeader
				kicker="Firma digital"
				title="Firma tu solicitud"
				desc="Firma con el mouse, trackpad o el dedo en pantalla táctil. La firma queda registrada criptográficamente con tu solicitud."
			/>
			<SignaturePadField />

			<Divider />

			{/* Términos — card destacada */}
			<div
				className="flex items-start gap-3.5 rounded-[14px] border-[1.5px] p-[16px_18px]"
				style={{
					background: 'var(--cf-bg-card)',
					borderColor: aceptaTerminos ? 'var(--cf-ink)' : 'var(--cf-line)',
				}}
			>
				<Controller
					control={control}
					name="aceptaTerminos"
					render={({ field }) => (
						<Checkbox
							id="aceptaTerminos"
							checked={field.value}
							onCheckedChange={(c) => field.onChange(c === true)}
							className="mt-1"
						/>
					)}
				/>
				<div className="min-w-0 flex-1">
					<label
						htmlFor="aceptaTerminos"
						className="cursor-pointer text-[13.5px] leading-[1.55]"
						style={{ color: 'var(--cf-ink)' }}
					>
						He leído y acepto los{' '}
						<a
							href="https://sotomayorconsulting.com/terminos-y-referencias-en-la-incorporacion-de-una-llc/"
							target="_blank"
							rel="noopener noreferrer"
							className="border-b font-semibold"
							style={{
								color: 'var(--cf-ink)',
								borderColor: 'var(--cf-ink)',
							}}
						>
							Términos y Condiciones
						</a>{' '}
						del servicio de incorporación de LLC, así como el procesamiento de
						datos personales conforme a la política de privacidad.
					</label>

					{aceptaTerminos && acceptedAt && (
						<div
							className="mt-1.5 inline-flex items-center gap-1.5 text-[11.5px]"
							style={{ color: 'var(--cf-ink-soft)' }}
						>
							<Icon
								icon="ri:lock-line"
								className="h-3 w-3"
								style={{ color: 'var(--cf-ink-soft)' }}
							/>
							<span className="cf-mono">Aceptado el {acceptedAt}</span>
						</div>
					)}

					<FieldError message={errors.aceptaTerminos?.message as string} />
				</div>
			</div>

			{!aceptaTerminos && (
				<div
					className="mt-3 flex items-center gap-3 rounded-lg border p-3"
					style={{
						background: 'var(--cf-bg-subtle)',
						borderColor: 'var(--cf-line)',
					}}
				>
					<Icon
						icon="ri:alert-line"
						className="h-4 w-4 shrink-0"
						style={{ color: 'var(--cf-ink-mute)' }}
					/>
					<p
						className="text-[12.5px]"
						style={{ color: 'var(--cf-ink-mute)' }}
					>
						Debe aceptar los términos y condiciones para enviar la solicitud.
					</p>
				</div>
			)}
		</>
	);
}

/**
 * Genera un timestamp formateado cuando el usuario acepta los términos.
 * Se evalúa en cada render — al ser un valor derivado de "ahora" no es
 * estable entre renders, pero el handoff lo muestra como UI feedback
 * inmediato (no se persiste).
 */
function useTermsTimestamp(accepted: boolean): string | null {
	if (!accepted) return null;
	if (typeof window === 'undefined') return null;
	const now = new Date();
	const date = now.toLocaleDateString('es', {
		day: 'numeric',
		month: 'short',
		year: 'numeric',
	});
	const time = now.toLocaleTimeString('es', {
		hour: '2-digit',
		minute: '2-digit',
		hour12: false,
	});
	return `${date} · ${time}`;
}
