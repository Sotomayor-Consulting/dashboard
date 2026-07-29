// ─── URLs públicas (client-safe) ────────────────────────
//
// Separado del driver a propósito: `supabase-driver.ts` importa
// `supabaseAdmin`, que lanza si falta la service-role key y NUNCA debe entrar
// al bundle del browser. Construir la URL de un bucket público es puro string,
// así que vive aquí y lo pueden importar islands y `.client.ts`.
//
// Al migrar a otro proveedor, este archivo pasa a construir la URL del dominio
// público correspondiente (p. ej. el custom domain de un bucket R2).

// `process` va guardado: en el bundle del browser no existe, y ahí el valor
// llega igual porque Vite inlinea las variables `PUBLIC_*`.
const urlFromProcess =
	typeof process !== 'undefined' ? process.env.PUBLIC_SUPABASE_URL : undefined;

const SUPABASE_URL = (
	urlFromProcess ??
	import.meta.env.PUBLIC_SUPABASE_URL ??
	''
).replace(/\/+$/, '');

/**
 * URL pública de un objeto. Solo tiene sentido en buckets públicos; en los
 * privados hay que usar `storage.createSignedUrl`.
 */
export function buildPublicUrl(bucket: string, path: string): string {
	const cleanPath = path.replace(/^\/+/, '');
	return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${cleanPath}`;
}
