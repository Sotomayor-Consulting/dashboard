// Clasificación fiscal IRS derivada de la forma de tributar + nº de socios.
// Módulo PURO (sin imports de servidor) para poder reutilizarse tanto en el
// island del wizard (cliente) como en los servicios SSR / generación de docs.

export type TaxTributation = 'pass_through' | 'corporation';

/**
 * Clasificación fiscal real ante el IRS:
 * - `disregarded_entity`: entidad de paso con 1 solo socio (single-member LLC).
 * - `partnership`: entidad de paso con 2+ socios (multi-member LLC).
 * - `corporation`: la LLC elige tributar como corporación.
 */
export type TaxClassification =
	| 'disregarded_entity'
	| 'partnership'
	| 'corporation';

/**
 * Deriva la clasificación fiscal IRS.
 *
 * Regla: si es entidad de paso (`pass_through`), 1 socio ⇒ `disregarded_entity`
 * y 2+ socios ⇒ `partnership`. Si elige corporación ⇒ `corporation`.
 *
 * Devuelve `null` si faltan datos para decidir (p.ej. pass_through sin nº de
 * socios definido).
 */
export const deriveTaxClassification = (
	taxTributation: TaxTributation | null,
	membersNumber: number | null,
): TaxClassification | null => {
	if (taxTributation === 'corporation') return 'corporation';
	if (taxTributation === 'pass_through') {
		if (membersNumber == null) return null;
		return membersNumber <= 1 ? 'disregarded_entity' : 'partnership';
	}
	return null;
};

/** Etiqueta legible (en inglés, terminología IRS) de la clasificación. */
export const TAX_CLASSIFICATION_LABEL: Record<TaxClassification, string> = {
	disregarded_entity: 'Disregarded entity',
	partnership: 'Partnership',
	corporation: 'Corporation',
};
