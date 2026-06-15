// Contrato de persistencia del formulario de incorporación (staging).
//
// El payload que se guarda en `workflow.incorporation_forms.payload` está
// DESACOPLADO del state de React (`ClientFormData`): así un refactor de la UI
// no rompe datos ya guardados. La columna `form_version` de la tabla viaja
// junto a este `version` para permitir migraciones futuras.
//
// Reglas del payload v1:
//  - No contiene `File` (no es JSON-serializable). Los archivos se suben aparte
//    a Storage (subida-al-seleccionar) y aquí viajan solo como rutas (`*Path`).
//  - La firma viaja como dataURL durante el borrador y como ruta (`firmaPath`)
//    una vez subida en el submit.

import type {
	ClientFormData,
	SerializableClientFormData,
	SerializableManager,
	SerializableMember,
} from '../types';

/** Versión del contrato. Debe coincidir con `incorporation_forms.form_version`. */
export const INCORPORATION_FORM_VERSION = 'v1' as const;

export interface IncorporationFormPayloadV1 extends SerializableClientFormData {
	version: typeof INCORPORATION_FORM_VERSION;
}

const stripMemberFiles = ({
	pasaporte: _p,
	facturaServicio: _f,
	...rest
}: ClientFormData['miembros'][number]): SerializableMember => rest;

const stripManagerFiles = ({
	pasaporte: _p,
	facturaServicio: _f,
	...rest
}: ClientFormData['managers'][number]): SerializableManager => rest;

/**
 * Proyecta el state del wizard al payload persistible. Quita los `File`
 * (en memoria) y conserva las rutas `*Path` ya subidas a Storage.
 */
export function toIncorporationFormPayload(
	data: ClientFormData,
): IncorporationFormPayloadV1 {
	const {
		facturaServicioBasico: _fb,
		facturaServicioBasicoEEUU: _fbus,
		miembros,
		managers,
		...rest
	} = data;

	return {
		...rest,
		version: INCORPORATION_FORM_VERSION,
		miembros: miembros.map(stripMemberFiles),
		managers: managers.map(stripManagerFiles),
	};
}

/**
 * Rehidrata el state del wizard desde un payload guardado. Los `File` quedan
 * en `null` (no son persistibles) pero las rutas `*Path` permiten mostrar el
 * estado "documento ya cargado" tras recargar.
 */
export function fromIncorporationFormPayload(
	payload: IncorporationFormPayloadV1 | SerializableClientFormData,
): ClientFormData {
	return {
		...payload,
		// La pregunta sí/no/sci ya no se renderiza: drafts viejos se normalizan.
		direccionOperativaEEUU: 'si',
		facturaServicioBasico: null,
		facturaServicioBasicoEEUU: null,
		miembros: payload.miembros.map((m) => ({
			...m,
			tipoIdentificacionFiscal: m.tipoIdentificacionFiscal ?? '',
			sitioWeb: m.sitioWeb ?? '',
			pasaporte: null,
			facturaServicio: null,
		})),
		managers: payload.managers.map((m) => ({
			...m,
			pasaporte: null,
			facturaServicio: null,
		})),
	};
}

const STEP_LABELS: Record<number, string> = {
	1: 'Identidad de la empresa',
	2: 'Actividad y dirección',
	3: 'Socios',
	4: 'Manager y responsable IRS',
	5: 'Confirmación y firma',
};

/** Etiqueta legible del paso, para `incorporation_forms.current_step`. */
export function stepLabel(step: number): string {
	return STEP_LABELS[step] ?? `Paso ${step}`;
}

/**
 * Progreso aproximado (0-100) por hitos completados, para los tableros de
 * Operaciones. No es validación: solo una señal de avance.
 */
export function computeFormProgress(data: ClientFormData): number {
	const milestones: boolean[] = [
		// Paso 2 — actividad + administración + tributación elegidas.
		data.ingresosEEUU !== null &&
			data.formaAdministracion !== '' &&
			data.formaTributacion !== '' &&
			(data.actividad !== '' || data.actividadNoEnLista),
		// Paso 3 — al menos un socio con datos y porcentajes que suman 100.
		data.miembros.length > 0 &&
			data.miembros.reduce((s, m) => s + (m.porcentaje || 0), 0) === 100,
		// Paso 4 — decisión de manager tomada.
		data.managerEsMiembro !== null || data.managerSCI !== null,
		// Paso 4 — responsable frente al IRS definido.
		data.responsableIRS !== '',
		// Paso 5 — firma y aceptación de términos.
		(data.firma !== null || (data.firmaPath ?? null) !== null) &&
			data.aceptaTerminos,
	];

	const done = milestones.filter(Boolean).length;
	return Math.round((done / milestones.length) * 100);
}

// La validación de integridad del servidor vive ahora en `v2.ts`
// (`validateIncorporationFormPayload`), que opera sobre el contrato v2 y cubre
// también el paso 2 y la presencia de documentos. `v1.ts` queda solo como
// lector de compatibilidad para drafts antiguos.
