// El bucket y el TTL de los enlaces firmados los define el adapter de storage
// (`@infrastructure/storage`); se re-exportan aquí por compatibilidad con los
// consumidores del barrel `@domains/documents`.
export {
	BUCKETS,
	DEFAULT_SIGNED_URL_TTL_SECONDS,
} from '@infrastructure/storage';

export const STAFF_ROLES = new Set(['admin', 'operaciones']);

export const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024;
