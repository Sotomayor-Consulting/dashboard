import { useState } from 'react';
import {
	useController,
	useFormContext,
	useWatch,
	type FieldPath,
} from 'react-hook-form';

import { useIncorporationId } from '../../context/incorporation-context';
import {
	deleteClientFile,
	uploadClientFile,
	type FileSlot,
} from '../../services/upload-client-file';
import type { ClientFormData, FileRef } from '../../types';
import { FileUploadField } from './FileUploadField';

interface Props {
	/** Ruta RHF al campo `File` (en memoria), p. ej. `miembros.0.pasaporte`. */
	fileName: FieldPath<ClientFormData>;
	/** Ruta RHF al campo de la ruta en Storage, p. ej. `miembros.0.pasaportePath`. */
	pathName: FieldPath<ClientFormData>;
	slot: FileSlot;
	id: string;
	label: string;
	description?: string;
	accept?: string;
	error?: string;
}

/**
 * Campo de archivo del wizard que sube al seleccionar: guarda el `File` en
 * memoria (para previsualizar) y persiste la ruta en Storage en el campo
 * `*Path` (JSON-safe, sobrevive recargas y viaja en el payload de staging).
 */
export function ClientFileField({
	fileName,
	pathName,
	slot,
	id,
	label,
	description,
	accept,
	error,
}: Props) {
	const incorporationId = useIncorporationId();
	const { control, setValue } = useFormContext<ClientFormData>();
	const { field } = useController({ control, name: fileName });
	const currentPath = useWatch({ control, name: pathName }) as
		| string
		| null
		| undefined;

	const [uploading, setUploading] = useState(false);
	const [localError, setLocalError] = useState<string | null>(null);

	// El campo `*Ref` (FileRef rico para el payload v2) es hermano del `*Path`
	// por convención: `…pasaportePath` → `…pasaporteRef`. Se derivan juntos para
	// no tener que cablear una prop extra en cada call site.
	const refName = pathName.replace(/Path$/, 'Ref') as typeof pathName;

	const setPath = (value: string | null) =>
		setValue(pathName, value as never, { shouldDirty: true });
	const setRef = (value: FileRef | null) =>
		setValue(refName, value as never, { shouldDirty: true });

	const handleChange = async (next: File | null) => {
		setLocalError(null);

		// Quitar archivo: limpiar File + ruta y borrar en Storage (best-effort).
		if (!next) {
			const prev = currentPath ?? null;
			field.onChange(null);
			setPath(null);
			setRef(null);
			if (prev) void deleteClientFile(prev, { incorporationId });
			return;
		}

		// Subir al seleccionar.
		field.onChange(next);
		setUploading(true);
		try {
			const ref = await uploadClientFile(next, { incorporationId, slot });
			setPath(ref.path);
			setRef({
				path: ref.path,
				name: ref.name ?? next.name,
				mime: next.type,
				size: next.size,
			});
		} catch {
			setLocalError('No se pudo subir el archivo. Inténtalo de nuevo.');
			field.onChange(null);
			setPath(null);
			setRef(null);
		} finally {
			setUploading(false);
		}
	};

	const shownError = error ?? localError ?? undefined;

	return (
		<FileUploadField
			id={id}
			label={label}
			{...(description ? { description } : {})}
			{...(accept ? { accept } : {})}
			file={(field.value as File | null) ?? null}
			onFileChange={handleChange}
			uploading={uploading}
			uploadedName={currentPath ? 'Documento cargado' : null}
			{...(shownError ? { error: shownError } : {})}
		/>
	);
}
