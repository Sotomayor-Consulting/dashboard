// ─── Contrato del adapter de Storage ────────────────────
//
// Interfaz agnóstica del backend: NO expone tipos de Supabase. Cambiar de
// proveedor (p. ej. Cloudflare R2 vía S3 API) significa escribir un driver
// nuevo que implemente `StorageDriver` y cambiar la línea de `index.ts`.
//
// Los nombres de bucket son `string` (no un union cerrado) porque la tabla
// `documents.documents` guarda el bucket en la columna `bucket_storage` y
// los callers la pasan tal cual desde la DB. Ver `buckets.ts` para las
// constantes conocidas.

/** Cuerpos aceptados al subir. `Buffer` es un `Uint8Array` en Node. */
export type StorageBody = File | Blob | ArrayBuffer | Uint8Array;

/** Entrada de un listado. Las carpetas no tienen tamaño ni mime. */
export interface StorageEntry {
	/** Nombre del archivo o carpeta, sin la ruta. */
	name: string;
	/** Ruta completa dentro del bucket (`prefix/name`). */
	path: string;
	isFolder: boolean;
	size: number | null;
	mimeType: string | null;
	updatedAt: string | null;
}

export interface UploadOptions {
	contentType?: string | undefined;
	/** Sobrescribir si ya existe. Por defecto `false`. */
	upsert?: boolean | undefined;
	cacheControl?: string | undefined;
}

export interface SignedUrlOptions {
	/** Segundos de validez. Por defecto `DEFAULT_SIGNED_URL_TTL_SECONDS`. */
	expiresIn?: number | undefined;
	/**
	 * Fuerza `Content-Disposition: attachment`. Si es string, se usa como
	 * nombre de archivo sugerido.
	 */
	download?: string | boolean | undefined;
}

export interface ListOptions {
	/** Máximo de entradas de la página. Por defecto 100. */
	limit?: number | undefined;
	offset?: number | undefined;
	sortBy?:
		| {
				column: 'name' | 'created_at' | 'updated_at';
				order: 'asc' | 'desc';
		  }
		| undefined;
}

export interface DownloadResult {
	body: ArrayBuffer;
	contentType: string | null;
}

export type StorageErrorCode =
	'NOT_FOUND' | 'ALREADY_EXISTS' | 'UNAUTHORIZED' | 'UNKNOWN';

/** Error normalizado: los callers no ven errores propios del proveedor. */
export class StorageError extends Error {
	readonly code: StorageErrorCode;
	readonly bucket: string;
	readonly path: string | undefined;

	constructor(
		code: StorageErrorCode,
		message: string,
		bucket: string,
		path?: string,
		options?: { cause?: unknown },
	) {
		super(message, options);
		this.name = 'StorageError';
		this.code = code;
		this.bucket = bucket;
		this.path = path;
	}
}

export interface StorageDriver {
	upload(
		bucket: string,
		path: string,
		body: StorageBody,
		options?: UploadOptions,
	): Promise<void>;

	download(bucket: string, path: string): Promise<DownloadResult>;

	/** Borrado idempotente: no falla si algún path ya no existe. */
	remove(bucket: string, paths: string[]): Promise<void>;

	/** Una página del listado de `prefix` (no recursivo, incluye carpetas). */
	list(
		bucket: string,
		prefix: string,
		options?: ListOptions,
	): Promise<StorageEntry[]>;

	/** Todos los archivos bajo `prefix`, recursivo y paginado. Sin carpetas. */
	listRecursive(bucket: string, prefix: string): Promise<StorageEntry[]>;

	/**
	 * Cuáles de `paths` existen. El driver decide la estrategia (agrupar por
	 * carpeta, HEAD por objeto, …) — por eso es una operación y no un `exists`
	 * suelto que obligaría al caller a hacer N llamadas.
	 */
	existsMany(bucket: string, paths: string[]): Promise<Set<string>>;

	createSignedUrl(
		bucket: string,
		path: string,
		options?: SignedUrlOptions,
	): Promise<string>;

	/** Solo para buckets públicos. Síncrono: es construcción de URL. */
	getPublicUrl(bucket: string, path: string): string;

	/** Ping para el readiness check. Lanza `StorageError` si falla. */
	healthCheck(): Promise<void>;
}
