import * as React from 'react';
import { Icon } from '@iconify/react';

import { Button } from '@components/ui/Button';
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@components/ui/Dialog';
import { cn } from '@components/utils';

/**
 * Origen de la propiedad del documento al subir. `member` no resuelve dueño
 * por sí mismo: se toma de la empresa (o de la incorporación) desde la que se
 * abre la ficha del miembro.
 */
export type MemberDocumentsOwner =
	{ kind: 'company'; id: string } | { kind: 'incorporation'; id: string };

interface DocumentTypeRow {
	id: number;
	slug: string;
	name: string;
	description: string | null;
	applies_to: string;
}

interface DocumentRow {
	id: string;
	file_name: string | null;
	file_title: string | null;
	mime_type: string | null;
	file_size_bytes: number | null;
	status: string | null;
	uploaded_at: string | null;
	created_at: string | null;
	document_types: {
		id: number;
		slug: string;
		name: string;
	} | null;
}

interface Props {
	memberId: string | null;
	owner: MemberDocumentsOwner;
	/**
	 * La carga solo se ofrece donde se edita la persona. En el sheet de la
	 * relación empresa↔miembro las tarjetas son de consulta: el documento es de
	 * la persona, no de su vínculo con esta empresa.
	 */
	canUpload: boolean;
	description?: string;
}

/**
 * Tarjetas de documentos de un miembro, una por tipo del catálogo.
 *
 * Los documentos son de la PERSONA (`related_to_type = 'member'`), no de la
 * fila de `company_members`: se ven desde cualquier empresa a la que pertenezca.
 *
 * Las tarjetas NO están hardcodeadas: se piden a `/api/documents/types` los
 * tipos activos cuyo `applies_to` es `member` o `generic`, y cada tarjeta se
 * identifica por el `slug` del tipo — la identidad estable entre proyectos.
 * Añadir un tipo al catálogo añade su tarjeta sin tocar este archivo.
 */
export default function MemberDocumentsPanel({
	memberId,
	owner,
	canUpload,
	description,
}: Props) {
	const [types, setTypes] = React.useState<DocumentTypeRow[]>([]);
	const [documents, setDocuments] = React.useState<DocumentRow[]>([]);
	const [isLoading, setIsLoading] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);
	const [uploadingSlug, setUploadingSlug] = React.useState<string | null>(null);
	const [pendingDelete, setPendingDelete] = React.useState<DocumentRow | null>(
		null,
	);
	const [isDeleting, setIsDeleting] = React.useState(false);

	const loadDocuments = React.useCallback(async () => {
		if (!memberId) {
			setDocuments([]);
			return;
		}
		const res = await fetch(
			`/api/documents/list?relatedToType=member&relatedToId=${memberId}`,
			{ headers: { Accept: 'application/json' } },
		);
		const payload = await res.json().catch(() => null);
		if (!res.ok) {
			throw new Error(payload?.error ?? 'No se pudieron cargar los documentos');
		}
		setDocuments((payload?.documents ?? []) as DocumentRow[]);
	}, [memberId]);

	React.useEffect(() => {
		let cancelled = false;
		if (!memberId) {
			setTypes([]);
			setDocuments([]);
			return;
		}

		setIsLoading(true);
		setError(null);

		(async () => {
			const typesRes = await fetch(
				'/api/documents/types?appliesTo=member,generic',
				{ headers: { Accept: 'application/json' } },
			);
			const typesPayload = await typesRes.json().catch(() => null);
			if (!typesRes.ok) {
				throw new Error(typesPayload?.error ?? 'No se pudo cargar el catálogo');
			}
			if (cancelled) return;
			setTypes((typesPayload?.types ?? []) as DocumentTypeRow[]);
			await loadDocuments();
		})()
			.catch((err: unknown) => {
				if (cancelled) return;
				setError(err instanceof Error ? err.message : 'Error inesperado');
			})
			.finally(() => {
				if (!cancelled) setIsLoading(false);
			});

		return () => {
			cancelled = true;
		};
	}, [memberId, loadDocuments]);

	const documentsBySlug = React.useMemo(() => {
		const map = new Map<string, DocumentRow[]>();
		for (const doc of documents) {
			if (doc.status === 'archived') continue;
			const slug = doc.document_types?.slug ?? 'other_generic';
			const prev = map.get(slug) ?? [];
			prev.push(doc);
			map.set(slug, prev);
		}
		return map;
	}, [documents]);

	/**
	 * `preview` pide la URL firmada sin `download`, así el navegador muestra el
	 * archivo en vez de bajarlo — mirar un pasaporte ya no deja una copia en el
	 * disco de quien lo revisa.
	 */
	const signedUrl = React.useCallback(
		async (documentId: string, mode: 'preview' | 'download') => {
			const res = await fetch('/api/documents/signed-url', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ documentId, mode }),
			});
			const payload = await res.json().catch(() => null);
			if (!res.ok || !payload?.signedUrl) {
				throw new Error(payload?.error ?? 'No se pudo generar el enlace');
			}
			return payload.signedUrl as string;
		},
		[],
	);

	const openDocument = async (
		documentId: string,
		mode: 'preview' | 'download',
	) => {
		try {
			const url = await signedUrl(documentId, mode);
			if (mode === 'preview') {
				window.open(url, '_blank', 'noopener');
				return;
			}
			const anchor = document.createElement('a');
			anchor.href = url;
			anchor.download = '';
			anchor.style.display = 'none';
			document.body.appendChild(anchor);
			anchor.click();
			anchor.remove();
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Error inesperado');
		}
	};

	const uploadDocument = async (type: DocumentTypeRow, file: File) => {
		if (!memberId) return;
		setUploadingSlug(type.slug);
		setError(null);
		try {
			const body = new FormData();
			body.append('file', file);
			body.append('relatedToType', 'member');
			body.append('relatedToId', memberId);
			body.append('documentTypeId', String(type.id));
			if (owner.kind === 'company') {
				body.append('companyId', owner.id);
			} else {
				body.append('caseId', owner.id);
			}

			const res = await fetch('/api/documents/upload', {
				method: 'POST',
				headers: { Accept: 'application/json' },
				body,
			});
			const payload = await res.json().catch(() => null);
			if (!res.ok) {
				throw new Error(payload?.error ?? 'No se pudo subir el documento');
			}
			await loadDocuments();
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Error inesperado');
		} finally {
			setUploadingSlug(null);
		}
	};

	/**
	 * Eliminar = archivar. Es el soft-delete del modelo de documentos: el
	 * archivo desaparece de las tarjetas pero conserva fila, bitácora y
	 * enlaces, y es reversible. El borrado permanente (`/api/documents/delete`)
	 * destruye la auditoría y queda reservado a admin.
	 */
	const deleteDocument = async () => {
		if (!pendingDelete) return;
		setIsDeleting(true);
		setError(null);
		try {
			const res = await fetch('/api/documents/archive', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ documentId: pendingDelete.id, archived: true }),
			});
			const payload = await res.json().catch(() => null);
			if (!res.ok) {
				throw new Error(payload?.error ?? 'No se pudo eliminar el documento');
			}
			setPendingDelete(null);
			await loadDocuments();
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Error inesperado');
		} finally {
			setIsDeleting(false);
		}
	};

	if (!memberId) return null;

	return (
		<div className="flex flex-col gap-3">
			<div>
				<p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
					Documentos
				</p>
				<p className="text-muted-foreground text-xs">
					{description ??
						'Archivos de esta persona. Se comparten con todas las empresas a las que pertenezca.'}
				</p>
			</div>

			{error ? (
				<p className="text-destructive text-xs" role="alert">
					{error}
				</p>
			) : null}

			{isLoading ? (
				<p className="text-muted-foreground text-xs">Cargando documentos…</p>
			) : (
				<div className="flex flex-col gap-2.5">
					{types.map((type) => (
						<DocumentTypeCard
							key={type.slug}
							type={type}
							documents={documentsBySlug.get(type.slug) ?? []}
							canUpload={canUpload}
							isUploading={uploadingSlug === type.slug}
							onOpen={openDocument}
							onUpload={(file) => uploadDocument(type, file)}
							{...(canUpload && { onDelete: setPendingDelete })}
						/>
					))}
				</div>
			)}

			<Dialog
				open={pendingDelete !== null}
				onOpenChange={(open) => {
					if (!open) setPendingDelete(null);
				}}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Eliminar documento</DialogTitle>
					</DialogHeader>
					<p className="text-muted-foreground text-sm">
						Se eliminará{' '}
						<strong>
							{pendingDelete?.file_title ||
								pendingDelete?.file_name ||
								'este documento'}
						</strong>{' '}
						de la ficha de la persona. Queda archivado, así que puede
						recuperarse desde el módulo de documentos.
					</p>
					<DialogFooter className="flex-row items-center justify-between gap-2">
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={() => setPendingDelete(null)}
						>
							Cancelar
						</Button>
						<Button
							type="button"
							variant="destructive"
							size="sm"
							className="gap-1.5"
							onClick={deleteDocument}
							disabled={isDeleting}
						>
							<Icon icon="ri:delete-bin-line" className="h-4 w-4" />
							{isDeleting ? 'Eliminando…' : 'Eliminar'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}

/**
 * Icono por slug. Es presentación pura: un slug desconocido cae al icono
 * genérico, así que el catálogo puede crecer sin romper nada aquí.
 */
const ICON_BY_SLUG: Record<string, string> = {
	identity_document: 'ri:passport-line',
	proof_of_address: 'ri:home-4-line',
	partner_contract: 'ri:file-paper-2-line',
	other_generic: 'ri:file-line',
};

/**
 * Tarjeta de un tipo de documento: cabecera con el nombre del tipo y la lista
 * de sus archivos.
 *
 * Deliberadamente plana. La versión con miniatura mostraba un icono de formato
 * que no decía nada del contenido —solo ocupaba— así que el archivo vuelve a
 * ser una línea: el nombre abre la vista previa y el icono de descarga baja el
 * archivo, dos gestos distintos y evidentes.
 */
function DocumentTypeCard({
	type,
	documents,
	canUpload,
	isUploading,
	onOpen,
	onUpload,
	onDelete,
}: {
	type: DocumentTypeRow;
	documents: DocumentRow[];
	canUpload: boolean;
	isUploading: boolean;
	onOpen: (documentId: string, mode: 'preview' | 'download') => void;
	onUpload: (file: File) => void;
	onDelete?: (doc: DocumentRow) => void;
}) {
	const inputRef = React.useRef<HTMLInputElement>(null);
	const hasDocuments = documents.length > 0;

	return (
		<div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
			<div className="flex items-center gap-2 px-3 py-2">
				<Icon
					icon={ICON_BY_SLUG[type.slug] ?? 'ri:file-line'}
					className="h-4 w-4 shrink-0 text-gray-400"
				/>
				<p className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-gray-900 dark:text-gray-100">
					{type.name}
				</p>
				{hasDocuments ? (
					<span className="text-muted-foreground shrink-0 text-[11px] tabular-nums">
						{documents.length}
					</span>
				) : null}
				{canUpload ? (
					<Button
						type="button"
						variant="ghost"
						size="icon-sm"
						className="shrink-0"
						disabled={isUploading}
						onClick={() => inputRef.current?.click()}
						aria-label={`Subir ${type.name}`}
					>
						<Icon
							icon={isUploading ? 'ri:loader-4-line' : 'ri:upload-2-line'}
							className={cn('h-4 w-4', isUploading && 'animate-spin')}
						/>
					</Button>
				) : null}
			</div>

			{hasDocuments ? (
				<ul className="border-t border-gray-200 dark:border-gray-700">
					{documents.map((doc) => {
						const name = doc.file_title || doc.file_name || 'Documento';
						// Mismo gutter que la cabecera (12px) y botones de 28px como el
						// de subir: el nombre arranca en la misma vertical que el icono
						// del tipo y los iconos de la derecha caen a plomo con él.
						return (
							<li
								key={doc.id}
								className="flex items-center gap-1 border-b border-gray-100 px-3 py-1 last:border-b-0 dark:border-gray-800/60"
							>
								<button
									type="button"
									onClick={() => onOpen(doc.id, 'preview')}
									title="Ver documento"
									className="-mx-1.5 min-w-0 flex-1 rounded-md px-1.5 py-1 text-left hover:bg-gray-50 dark:hover:bg-neutral-800/60"
								>
									<span className="block truncate text-[12px] text-gray-700 dark:text-gray-300">
										{name}
									</span>
								</button>
								<span className="text-muted-foreground shrink-0 text-[11px] tabular-nums">
									{formatSize(doc.file_size_bytes)}
								</span>
								<button
									type="button"
									onClick={() => onOpen(doc.id, 'download')}
									aria-label={`Descargar ${name}`}
									title="Descargar"
									className="flex size-7 shrink-0 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-neutral-800 dark:hover:text-gray-200"
								>
									<Icon icon="ri:download-2-line" className="h-4 w-4" />
								</button>
								{onDelete ? (
									<button
										type="button"
										onClick={() => onDelete(doc)}
										aria-label={`Eliminar ${name}`}
										title="Eliminar"
										className="text-destructive/70 hover:text-destructive hover:bg-destructive/10 flex size-7 shrink-0 items-center justify-center rounded-md"
									>
										<Icon icon="ri:delete-bin-line" className="h-4 w-4" />
									</button>
								) : null}
							</li>
						);
					})}
				</ul>
			) : (
				<p className="text-muted-foreground border-t border-gray-200 px-3 py-2 text-[11.5px] dark:border-gray-700">
					Sin cargar
				</p>
			)}

			<input
				ref={inputRef}
				type="file"
				className="hidden"
				onChange={(event) => {
					const file = event.target.files?.[0];
					if (file) onUpload(file);
					event.target.value = '';
				}}
			/>
		</div>
	);
}

function formatSize(bytes: number | null) {
	if (!bytes || bytes <= 0) return '';
	const units = ['B', 'KB', 'MB'];
	let value = bytes;
	let unit = 0;
	while (value >= 1024 && unit < units.length - 1) {
		value /= 1024;
		unit += 1;
	}
	return `${value.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`;
}
