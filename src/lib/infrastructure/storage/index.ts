// ─── Adapter de Storage ─────────────────────────────────
//
// Punto de entrada único para leer/escribir archivos. Ningún otro archivo
// debería llamar a `supabase.storage` directamente.
//
//   import { storage, BUCKETS } from '@infrastructure/storage';
//   await storage.upload(BUCKETS.documents, path, file, { contentType });
//   const url = await storage.createSignedUrl(BUCKETS.documents, path);
//
// SOLO SERVIDOR: importa `supabaseAdmin`, que exige la service-role key. Para
// construir URLs públicas desde el browser usar `@infrastructure/storage/public-url`.
//
// ─── Cambiar de proveedor ───────────────────────────────
// Escribir un driver que implemente `StorageDriver` (p. ej. `r2-driver.ts`
// sobre `@aws-sdk/client-s3`) y cambiar las dos líneas de abajo. Ojo con lo
// que NO viaja en el cambio: hoy `createScopedStorage` delega la autorización
// en las políticas RLS de `storage.objects`; un backend S3 no las tiene y esa
// verificación pasa a ser responsabilidad del route.

import type { SupabaseClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@infrastructure/supabase/admin';
import { createSupabaseStorageDriver } from './supabase-driver';
import type { StorageDriver } from './types';

/** Storage con service-role: ignora RLS, autoriza el caller. */
export const storage: StorageDriver =
	createSupabaseStorageDriver(supabaseAdmin);

/**
 * Storage atado a la sesión del request, de modo que las políticas RLS de
 * `storage.objects` sigan aplicando como segunda línea de defensa.
 *
 * Específico de Supabase: un driver S3/R2 no puede honrar esto y tendría que
 * devolver el driver de service-role. Úsalo solo donde el RLS aporte algo real
 * (escrituras del propio usuario en su carpeta).
 */
export function createScopedStorage(client: SupabaseClient): StorageDriver {
	return createSupabaseStorageDriver(client);
}

export { BUCKETS, DEFAULT_SIGNED_URL_TTL_SECONDS } from './buckets';
export type { KnownBucket } from './buckets';
export { buildPublicUrl } from './public-url';
export { StorageError } from './types';
export type {
	DownloadResult,
	ListOptions,
	SignedUrlOptions,
	StorageBody,
	StorageDriver,
	StorageEntry,
	StorageErrorCode,
	UploadOptions,
} from './types';
