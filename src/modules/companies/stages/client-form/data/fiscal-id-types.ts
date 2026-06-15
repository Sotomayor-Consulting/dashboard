import type { FiscalIdType } from '../types';

/**
 * Tipos de número de identificación fiscal para socios persona jurídica,
 * según el país de constitución de la empresa.
 */
export const FISCAL_ID_TYPES: ReadonlyArray<{
	value: Exclude<FiscalIdType, ''>;
	label: string;
}> = [
	{ value: 'ein', label: 'EIN' },
	{ value: 'ruc', label: 'RUC' },
	{ value: 'nit', label: 'NIT' },
	{ value: 'otro', label: 'Otro' },
];

export const fiscalIdTypeLabel = (value: string | undefined): string =>
	FISCAL_ID_TYPES.find((t) => t.value === value)?.label ?? '';
