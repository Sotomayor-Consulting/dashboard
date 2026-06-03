import type { ReactNode } from 'react';
import { Icon } from '@iconify/react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import { Button } from '@components/ui/Button';
import { Sheet, SheetContent } from '@components/ui/Sheet';

import type { TemplateWithDocument } from '@domains/templates/types';
import { getEntityLabel, type EntityType } from '@domains/templates/entity-registry';

import { TemplateStatusBadge } from './cells/TemplateStatusBadge';
import { TemplateTypeBadge } from './cells/TemplateTypeBadge';

interface Props {
	template: TemplateWithDocument | null;
	onOpenChange: (open: boolean) => void;
	onEdit: (t: TemplateWithDocument) => void;
	onMap: (t: TemplateWithDocument) => void;
	onUpload: (t: TemplateWithDocument) => void;
	onDownload: (t: TemplateWithDocument) => void;
	onArchive: (t: TemplateWithDocument) => void;
	onRestore: (t: TemplateWithDocument) => void;
	transformerMap: Record<string, { name: string }>;
}

function fmtBytes(bytes?: number | null) {
	if (!bytes || bytes <= 0) return '—';
	const units = ['B', 'KB', 'MB'];
	let i = 0;
	let size = bytes;
	while (size >= 1024 && i < units.length - 1) {
		size /= 1024;
		i++;
	}
	return `${size.toFixed(1)} ${units[i]}`;
}

function fmtDate(raw?: string | null) {
	if (!raw) return '—';
	const d = new Date(raw);
	if (Number.isNaN(d.getTime())) return '—';
	return format(d, "dd MMM yyyy · HH:mm", { locale: es });
}

function KV({
	label,
	value,
	mono,
}: {
	label: string;
	value: ReactNode;
	mono?: boolean;
}) {
	return (
		<div>
			<dt className="text-[10px] font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
				{label}
			</dt>
			<dd
				className={
					'mt-0.5 text-[12.5px] text-gray-900 dark:text-gray-100 ' +
					(mono ? 'font-mono tabular-nums' : '')
				}
			>
				{value || <span className="text-gray-400 italic">—</span>}
			</dd>
		</div>
	);
}

export function TemplateDetailSheet({
	template,
	onOpenChange,
	onEdit,
	onMap,
	onUpload,
	onDownload,
	onArchive,
	onRestore,
	transformerMap,
}: Props) {
	const open = template !== null;
	const t = template;

	const mappedCount = t ? Object.keys(t.field_mapping ?? {}).length : 0;
	const detectedCount = t ? (t.field_definitions ?? []).length : 0;
	const transformerName = t?.transformer_id ? transformerMap[t.transformer_id]?.name : undefined;
	const hasFile = !!(t?.document || t?.source_url);
	const canMap = !!t && t.template_type === 'pdf' && hasFile;
	const isDeleted = !!t?.deleted_at;

	return (
		<Sheet
			open={open}
			modal={false}
			onOpenChange={(o) => {
				if (!o) onOpenChange(false);
			}}
		>
			<SheetContent
				side="right"
				className="flex !w-full flex-col overflow-y-auto !p-0 sm:!max-w-[460px]"
				showCloseButton
			>
				{t && (
					<>
						{/* Header */}
						<div className="border-b border-gray-200 px-5 py-5 dark:border-gray-800">
							<div className="flex flex-wrap items-center gap-2">
								<TemplateTypeBadge type={t.template_type} />
								<TemplateStatusBadge template={t} />
								{t.category && (
									<span className="rounded-md bg-gray-100 px-2 py-0.5 text-[10.5px] font-medium text-gray-600 capitalize dark:bg-neutral-800 dark:text-gray-300">
										{t.category}
									</span>
								)}
							</div>
							<div className="mt-3 flex items-start gap-3">
								<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100 dark:bg-neutral-800">
									<Icon
										icon={t.template_type === 'pdf' ? 'ri:file-text-line' : 'ri:file-word-2-line'}
										className="h-5 w-5 text-gray-500 dark:text-gray-400"
									/>
								</div>
								<div className="min-w-0">
									<p className="text-[16px] font-semibold text-gray-900 dark:text-gray-100">
										{t.name}
									</p>
									<p className="mt-0.5 text-[11.5px] text-gray-500 dark:text-gray-400">
										{t.description || 'Sin descripción'}
									</p>
								</div>
							</div>
						</div>

						{/* Configuración */}
						<section className="border-b border-gray-200 px-5 py-5 dark:border-gray-800">
							<p className="mb-3 text-[10px] font-semibold tracking-wider text-gray-500 uppercase dark:text-gray-400">
								Configuración
							</p>
							<dl className="grid grid-cols-2 gap-3">
								<KV
									label="Entidad asociada"
									value={t.related_to_type ? getEntityLabel(t.related_to_type as EntityType) : null}
								/>
								<KV label="Transformer" value={transformerName ?? t.transformer_id} />
								<KV label="Versión" value={`v${t.version}`} mono />
								<KV
									label="Generación"
									value={t.template_type === 'pdf' ? 'AcroForm (pdf-lib)' : 'Carbone (Word)'}
								/>
							</dl>
						</section>

						{/* Archivo */}
						<section className="border-b border-gray-200 px-5 py-5 dark:border-gray-800">
							<p className="mb-3 text-[10px] font-semibold tracking-wider text-gray-500 uppercase dark:text-gray-400">
								Archivo
							</p>
							{t.document ? (
								<div className="flex items-center gap-3 rounded-md border border-gray-200 px-3 py-2.5 dark:border-gray-800">
									<Icon icon="ri:attachment-2" className="h-4 w-4 shrink-0 text-gray-400" />
									<div className="min-w-0 flex-1">
										<p className="truncate text-[12.5px] font-medium text-gray-900 dark:text-gray-100">
											{t.document.file_name}
										</p>
										<p className="text-[11px] text-gray-500 dark:text-gray-400">
											{fmtBytes(t.document.file_size_bytes)} · {t.document.mime_type ?? '—'}
										</p>
									</div>
									<div className="flex gap-2">
										<Button
											size="sm"
											variant="outline"
											className="h-8 gap-1.5"
											onClick={() => onDownload(t)}
										>
											<Icon icon="ri:download-2-line" className="h-4 w-4" />
											Descargar
										</Button>
										<Button
											size="sm"
											variant="outline"
											className="h-8 gap-1.5"
											onClick={() => onUpload(t)}
										>
											<Icon icon="ri:upload-2-line" className="h-4 w-4" />
											Reemplazar
										</Button>
									</div>
								</div>
							) : t.source_url ? (
								<div className="flex items-center gap-3 rounded-md border border-gray-200 px-3 py-2.5 dark:border-gray-800">
									<Icon icon="ri:link" className="h-4 w-4 shrink-0 text-blue-500" />
									<a
										href={t.source_url}
										target="_blank"
										rel="noreferrer"
										className="min-w-0 flex-1 truncate text-[12.5px] text-blue-600 hover:underline dark:text-blue-400"
									>
										{t.source_url}
									</a>
								</div>
							) : (
								<div className="flex items-center justify-between gap-3 rounded-md border border-dashed border-gray-300 px-3 py-2.5 dark:border-gray-700">
									<span className="text-[12px] text-gray-500 dark:text-gray-400">
										Sin archivo subido
									</span>
									<Button
										size="sm"
										variant="outline"
										className="h-8 gap-1.5"
										onClick={() => onUpload(t)}
									>
										<Icon icon="ri:upload-2-line" className="h-4 w-4" />
										Subir
									</Button>
								</div>
							)}
						</section>

						{/* Mapeo de campos (solo PDF) */}
						{t.template_type === 'pdf' && (
							<section className="border-b border-gray-200 px-5 py-5 dark:border-gray-800">
								<p className="mb-3 text-[10px] font-semibold tracking-wider text-gray-500 uppercase dark:text-gray-400">
									Mapeo de campos
								</p>
								<dl className="grid grid-cols-2 gap-3">
									<KV label="Campos detectados" value={String(detectedCount)} mono />
									<KV label="Campos mapeados" value={String(mappedCount)} mono />
								</dl>
								{canMap && (
									<Button
										size="sm"
										variant="outline"
										className="mt-3 w-full gap-1.5"
										onClick={() => onMap(t)}
									>
										<Icon icon="ri:links-line" className="h-4 w-4" />
										Editar mapeo
									</Button>
								)}
							</section>
						)}

						{/* Auditoría */}
						<section className="border-b border-gray-200 px-5 py-5 dark:border-gray-800">
							<p className="mb-3 text-[10px] font-semibold tracking-wider text-gray-500 uppercase dark:text-gray-400">
								Auditoría
							</p>
							<dl className="grid grid-cols-2 gap-3">
								<KV label="Creada" value={fmtDate(t.created_at)} />
								<KV label="Actualizada" value={fmtDate(t.updated_at)} />
								{isDeleted && <KV label="Eliminada" value={fmtDate(t.deleted_at)} />}
							</dl>
						</section>

						{/* Footer acciones */}
						<div className="sticky bottom-0 mt-auto flex items-center gap-2 border-t border-gray-200 bg-white px-5 py-3 dark:border-gray-800 dark:bg-neutral-950">
							{isDeleted ? (
								<Button size="sm" className="ml-auto gap-1.5" onClick={() => onRestore(t)}>
									<Icon icon="ri:arrow-go-back-line" className="h-4 w-4" />
									Restaurar
								</Button>
							) : (
								<>
									<Button
										size="sm"
										variant="outline"
										className="gap-1.5"
										onClick={() => onArchive(t)}
									>
										<Icon icon="ri:archive-line" className="h-4 w-4" />
										Archivar
									</Button>
									<Button
										size="sm"
										className="ml-auto gap-1.5"
										onClick={() => onEdit(t)}
									>
										<Icon icon="ri:edit-line" className="h-4 w-4" />
										Editar
									</Button>
								</>
							)}
						</div>
					</>
				)}
			</SheetContent>
		</Sheet>
	);
}
