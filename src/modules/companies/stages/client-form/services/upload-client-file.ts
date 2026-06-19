// Subida-al-seleccionar de archivos del formulario. Sube un `File` al endpoint
// de staging y devuelve la ruta en Storage para guardarla en el payload.

export interface UploadedFileRef {
	path: string;
	name: string;
}

export type FileSlot =
	| 'member-pasaporte'
	| 'member-factura'
	| 'manager-pasaporte'
	| 'manager-factura'
	| 'company-utility-us'
	| 'company-utility-other';

export async function uploadClientFile(
	file: File,
	ctx: { incorporationId: string; slot: FileSlot; entityId?: string },
): Promise<UploadedFileRef> {
	const fd = new FormData();
	fd.append('file', file);
	fd.append('slot', ctx.slot);
	if (ctx.entityId) fd.append('entityId', ctx.entityId);

	const res = await fetch(`/api/incorporations/${ctx.incorporationId}/files`, {
		method: 'POST',
		body: fd,
	});
	const data = (await res.json().catch(() => null)) as {
		ok: boolean;
		path?: string;
		name?: string;
		error?: string;
	} | null;

	if (!res.ok || !data?.ok || !data.path) {
		throw new Error(data?.error ?? 'UPLOAD_FAILED');
	}
	return { path: data.path, name: data.name ?? file.name };
}

/** Borra un archivo ya subido (best-effort, al quitarlo del formulario). */
export async function deleteClientFile(
	path: string,
	ctx: { incorporationId: string },
): Promise<void> {
	try {
		await fetch(`/api/incorporations/${ctx.incorporationId}/files`, {
			method: 'DELETE',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ path }),
		});
	} catch {
		/* best-effort: si falla, queda un archivo huérfano que ops puede limpiar */
	}
}
