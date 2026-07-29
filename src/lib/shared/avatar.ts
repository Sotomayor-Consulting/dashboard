// Importa el helper client-safe del adapter (no el barrel `@infrastructure/storage`,
// que arrastra el cliente service-role): este módulo se usa también desde
// islands `.tsx` que corren en el browser.
import { BUCKETS } from '@infrastructure/storage/buckets';
import { buildPublicUrl } from '@infrastructure/storage/public-url';

const NULL_VALUES = new Set(['NULL', 'null', '']);

/**
 * Convierte el `avatar_url` guardado en DB (un path relativo al bucket) en una
 * URL usable. Acepta URLs absolutas tal cual (avatares de proveedores OAuth).
 */
export function getAvatarUrl(path: string | null | undefined): string | null {
	if (!path || NULL_VALUES.has(path)) return null;
	if (path.startsWith('http://') || path.startsWith('https://')) return path;
	return buildPublicUrl(BUCKETS.publicAssets, path);
}
