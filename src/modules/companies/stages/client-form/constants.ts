/** Key de localStorage donde se persiste el draft del wizard. */
export const CLIENT_FORM_DRAFT_KEY =
	'sotomayor:client-incorporation-form:draft';

/** Tamaño máximo de archivo (bytes). */
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

/** Tipos MIME aceptados para uploads de identidad/factura. */
export const ACCEPTED_FILE_TYPES = [
	'application/pdf',
	'image/jpeg',
	'image/png',
];

/** Mensaje legible del límite, para mostrar en la UI. */
export const MAX_FILE_SIZE_LABEL = '5 MB';
