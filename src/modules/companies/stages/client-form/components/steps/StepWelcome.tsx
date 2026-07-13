import { Icon } from '@iconify/react';

import { Callout, ChecklistRow, KickerLabel, MetadataPill } from '../../atoms';
import type { EstadoOption } from '../../services/get-client-form-data';
import { IdentityCard } from './IdentityCard';

const CHECKLIST = [
	{
		num: 1,
		icon: 'ri:briefcase-line',
		title: 'Información general de la empresa',
		description:
			'Industria, descripción de operaciones, mercado y forma de tributación.',
		estimatedTime: '3 min',
	},
	{
		num: 2,
		icon: 'ri:group-line',
		title: 'Datos de los miembros',
		description:
			'Nombres completos, documentos de identidad y porcentaje de participación.',
		estimatedTime: '5–8 min',
	},
	{
		num: 3,
		icon: 'ri:user-settings-line',
		title: 'Designación del manager',
		description:
			'Persona designada para representar la entidad (solo en Manager-Managed).',
		estimatedTime: '1 min',
	},
	{
		num: 4,
		icon: 'ri:file-check-line',
		title: 'Revisión y firma digital',
		description: 'Confirme la información y firme para enviar la solicitud.',
		estimatedTime: '1 min',
	},
] as const;

/**
 * Pantalla 1 — Bienvenida.
 *
 * Estructura:
 *   1. Hero copy (con "10–15 minutos" destacado)
 *   2. Pills de metadata (tiempo, autosave, cifrado)
 *   3. Checklist con 4 items numerados
 *   4. Callout verde de acompañamiento
 *
 * Este paso NO envía datos — solo botón "Comenzar formulario" en el
 * footer del shell que avanza al paso 2 (controlado por el padre).
 */
interface Props {
	empresaId: string;
	/** 3 opciones de nombre pre-cargadas. */
	nameOptions: [string, string, string];
	/** Estado de incorporación (Florida, Wyoming, Delaware, …). */
	estado: string | null;
	/** Lista de estados disponibles. */
	estados: EstadoOption[];
	/** Notifica cambios de estado al wizard (re-evalúa reglas). */
	onEstadoChange: (estado: string) => void;
}

export function StepWelcome({
	empresaId,
	nameOptions,
	estado,
	estados,
	onEstadoChange,
}: Props) {
	return (
		<>
			{/* Hero copy */}
			<p
				className="m-0 mb-[14px] max-w-[620px] text-[16px] leading-[1.6]"
				style={{ color: 'var(--cf-ink-mute)' }}
			>
				Para continuar con el proceso de incorporación de su LLC, es necesario
				completar el siguiente formulario.
			</p>
			{/* Pills de metadata */}
			<div className="mt-[22px] mb-9 flex flex-wrap gap-2.5">
				<MetadataPill
					icon={<Icon icon="ri:time-line" className="h-3.5 w-3.5" />}
				>
					10–15 min total
				</MetadataPill>
				<MetadataPill
					icon={<Icon icon="ri:lock-line" className="h-3.5 w-3.5" />}
				>
					Datos cifrados
				</MetadataPill>
			</div>
			{/* Identity Card — datos pre-cargados editables */}
			<IdentityCard
				empresaId={empresaId}
				initialNames={nameOptions}
				estado={estado}
				estados={estados}
				onEstadoChange={onEstadoChange}
			/>
			{/* Checklist header */}
			<div
				className="mb-1 border-b pb-3.5"
				style={{ borderColor: 'var(--cf-line)' }}
			>
				<KickerLabel>Lo que necesitará tener a la mano</KickerLabel>
			</div>

			{/* Checklist rows */}
			<div>
				{CHECKLIST.map((row) => (
					<ChecklistRow
						key={row.num}
						num={row.num}
						icon={row.icon}
						title={row.title}
						description={row.description}
						estimatedTime={row.estimatedTime}
					/>
				))}
			</div>

			{/* Callout verde — acompañamiento */}
			<div className="mt-8">
				<Callout
					tone="accent"
					icon={
						<Icon
							icon="ri:lightbulb-flash-line"
							className="dark:bg h-auto w-auto dark:text-green-400"
						/>
					}
					title="Información importante"
				>
					Una vez enviada la solicitud, nuestro equipo revisará validara la
					información y se pondrá en contacto para cualquier consulta adicional.
				</Callout>
			</div>
		</>
	);
}
