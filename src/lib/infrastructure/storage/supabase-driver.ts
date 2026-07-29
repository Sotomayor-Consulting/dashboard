// ─── Driver de Storage sobre Supabase ───────────────────
//
// Única parte del codebase que conoce `supabase.storage`. Traduce el API de
// supabase-js al contrato de `StorageDriver` y normaliza sus errores.
//
// SOLO SERVIDOR (a través de `index.ts`, que inyecta `supabaseAdmin`).

import type { SupabaseClient } from '@supabase/supabase-js';
import { DEFAULT_SIGNED_URL_TTL_SECONDS } from './buckets';
import { buildPublicUrl } from './public-url';
import {
	StorageError,
	type DownloadResult,
	type ListOptions,
	type SignedUrlOptions,
	type StorageBody,
	type StorageDriver,
	type StorageEntry,
	type StorageErrorCode,
	type UploadOptions,
} from './types';

/** Tamaño de página al recorrer carpetas completas. */
const PAGE_SIZE = 100;

/**
 * Supabase Storage no expone códigos de error estables: hay que inferirlos del
 * status HTTP y, en su defecto, del mensaje. Aislado aquí para que el resto del
 * código no dependa de estas heurísticas.
 */
function classify(error: unknown): StorageErrorCode {
	const status = Number(
		(error as { statusCode?: string | number; status?: number })?.statusCode ??
			(error as { status?: number })?.status ??
			0,
	);
	if (status === 404) return 'NOT_FOUND';
	if (status === 409) return 'ALREADY_EXISTS';
	if (status === 401 || status === 403) return 'UNAUTHORIZED';

	const message = String(
		(error as { message?: string })?.message ?? '',
	).toLowerCase();
	if (message.includes('not found') || message.includes('does not exist')) {
		return 'NOT_FOUND';
	}
	if (message.includes('already exists') || message.includes('duplicate')) {
		return 'ALREADY_EXISTS';
	}
	if (
		message.includes('row-level security') ||
		message.includes('unauthorized') ||
		message.includes('access denied')
	) {
		return 'UNAUTHORIZED';
	}
	return 'UNKNOWN';
}

function wrap(
	error: unknown,
	fallbackMessage: string,
	bucket: string,
	path?: string,
): StorageError {
	const message = (error as { message?: string })?.message ?? fallbackMessage;
	return new StorageError(classify(error), message, bucket, path, {
		cause: error,
	});
}

interface RawFileObject {
	name: string;
	id?: string | null;
	updated_at?: string | null;
	metadata?: {
		size?: number | null;
		mimetype?: string | null;
	} | null;
}

/** En Supabase una "carpeta" es una entrada sintética sin `id` ni `metadata`. */
function toEntry(item: RawFileObject, prefix: string): StorageEntry {
	const isFolder = !item.metadata;
	return {
		name: item.name,
		path: prefix ? `${prefix}/${item.name}` : item.name,
		isFolder,
		size: item.metadata?.size ?? null,
		mimeType: item.metadata?.mimetype ?? null,
		updatedAt: item.updated_at ?? null,
	};
}

export function createSupabaseStorageDriver(
	client: SupabaseClient,
): StorageDriver {
	/** Lista una carpeta completa paginando hasta agotarla. */
	async function listAll(
		bucket: string,
		prefix: string,
	): Promise<StorageEntry[]> {
		const entries: StorageEntry[] = [];
		let offset = 0;

		for (;;) {
			const { data, error } = await client.storage
				.from(bucket)
				.list(prefix, { limit: PAGE_SIZE, offset });

			if (error) throw wrap(error, 'Error listando archivos', bucket, prefix);
			if (!data || data.length === 0) break;

			for (const item of data) entries.push(toEntry(item, prefix));
			if (data.length < PAGE_SIZE) break;
			offset += PAGE_SIZE;
		}

		return entries;
	}

	const driver: StorageDriver = {
		async upload(
			bucket: string,
			path: string,
			body: StorageBody,
			options?: UploadOptions,
		): Promise<void> {
			const fileOptions: {
				upsert: boolean;
				contentType?: string;
				cacheControl?: string;
			} = { upsert: options?.upsert ?? false };
			if (options?.contentType) fileOptions.contentType = options.contentType;
			if (options?.cacheControl) {
				fileOptions.cacheControl = options.cacheControl;
			}

			const { error } = await client.storage
				.from(bucket)
				.upload(path, body, fileOptions);

			if (error) throw wrap(error, 'Error subiendo el archivo', bucket, path);
		},

		async download(bucket: string, path: string): Promise<DownloadResult> {
			const { data, error } = await client.storage.from(bucket).download(path);

			if (error || !data) {
				throw wrap(error, 'Error descargando el archivo', bucket, path);
			}

			return {
				body: await data.arrayBuffer(),
				contentType: data.type || null,
			};
		},

		async remove(bucket: string, paths: string[]): Promise<void> {
			if (paths.length === 0) return;

			const { error } = await client.storage.from(bucket).remove(paths);
			if (error) throw wrap(error, 'Error eliminando archivos', bucket);
		},

		async list(
			bucket: string,
			prefix: string,
			options?: ListOptions,
		): Promise<StorageEntry[]> {
			const listOptions: {
				limit: number;
				offset: number;
				sortBy?: { column: string; order: string };
			} = {
				limit: options?.limit ?? PAGE_SIZE,
				offset: options?.offset ?? 0,
			};
			if (options?.sortBy) listOptions.sortBy = options.sortBy;

			const { data, error } = await client.storage
				.from(bucket)
				.list(prefix, listOptions);

			if (error) throw wrap(error, 'Error listando archivos', bucket, prefix);
			return (data ?? []).map((item) => toEntry(item, prefix));
		},

		async listRecursive(
			bucket: string,
			prefix: string,
		): Promise<StorageEntry[]> {
			const files: StorageEntry[] = [];
			const pending = [prefix];

			while (pending.length > 0) {
				const folder = pending.pop() as string;
				for (const entry of await listAll(bucket, folder)) {
					if (entry.isFolder) pending.push(entry.path);
					else files.push(entry);
				}
			}

			return files;
		},

		async existsMany(bucket: string, paths: string[]): Promise<Set<string>> {
			if (paths.length === 0) return new Set();

			// Agrupar por carpeta: un listado por carpeta sale más barato que un
			// signed URL (o un HEAD) por archivo.
			const byFolder = new Map<string, string[]>();
			for (const path of paths) {
				const folder = path.slice(0, path.lastIndexOf('/'));
				const group = byFolder.get(folder);
				if (group) group.push(path);
				else byFolder.set(folder, [path]);
			}

			const found = new Set<string>();
			await Promise.all(
				[...byFolder.entries()].map(async ([folder, folderPaths]) => {
					const entries = await listAll(bucket, folder);
					const names = new Set(
						entries.filter((e) => !e.isFolder).map((e) => e.name),
					);
					for (const path of folderPaths) {
						const name = path.slice(path.lastIndexOf('/') + 1);
						if (names.has(name)) found.add(path);
					}
				}),
			);

			return found;
		},

		async createSignedUrl(
			bucket: string,
			path: string,
			options?: SignedUrlOptions,
		): Promise<string> {
			const urlOptions: { download?: string | boolean } = {};
			if (options?.download !== undefined) {
				urlOptions.download = options.download;
			}

			const { data, error } = await client.storage
				.from(bucket)
				.createSignedUrl(
					path,
					options?.expiresIn ?? DEFAULT_SIGNED_URL_TTL_SECONDS,
					urlOptions,
				);

			if (error || !data?.signedUrl) {
				throw wrap(error, 'Error generando el enlace', bucket, path);
			}

			return data.signedUrl;
		},

		getPublicUrl(bucket: string, path: string): string {
			return buildPublicUrl(bucket, path);
		},

		async healthCheck(): Promise<void> {
			const { error } = await client.storage.listBuckets();
			if (error) throw wrap(error, 'Storage no disponible', '*');
		},
	};

	return driver;
}
