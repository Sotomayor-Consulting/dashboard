import { Icon } from '@iconify/react';

import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@components/ui/DropdownMenu';

import type { TemplateWithDocument } from '@domains/templates/types';

interface Props {
	template: TemplateWithDocument;
	onView: (t: TemplateWithDocument) => void;
	onEdit: (t: TemplateWithDocument) => void;
	onMap: (t: TemplateWithDocument) => void;
	onUpload: (t: TemplateWithDocument) => void;
	onDownload: (t: TemplateWithDocument) => void;
	onDuplicate: (t: TemplateWithDocument) => void;
	onCopyId: (t: TemplateWithDocument) => void;
	onSoftDelete: (t: TemplateWithDocument) => void;
	onRestore: (t: TemplateWithDocument) => void;
	onHardDelete: (t: TemplateWithDocument) => void;
}

/** Menú contextual ⋯ por fila de plantilla. */
export function TemplateRowActions({
	template,
	onView,
	onEdit,
	onMap,
	onUpload,
	onDownload,
	onDuplicate,
	onCopyId,
	onSoftDelete,
	onRestore,
	onHardDelete,
}: Props) {
	const isDeleted = !!template.deleted_at;
	const hasFile = !!(template.document || template.source_url);
	const canMap = template.template_type === 'pdf' && hasFile;

	const stop = (fn: () => void) => (e: React.MouseEvent | Event) => {
		e.stopPropagation();
		fn();
	};

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={
					<button
						type="button"
						onClick={(e) => e.stopPropagation()}
						className="inline-flex h-7 w-7 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-neutral-800 dark:hover:text-gray-200"
						aria-label="Acciones"
					>
						<Icon icon="ri:more-line" className="h-4 w-4" />
					</button>
				}
			/>
			<DropdownMenuContent align="end" className="w-52">
				<DropdownMenuItem onClick={stop(() => onView(template))}>
					<Icon icon="ri:eye-line" className="h-4 w-4" />
					Ver detalle
				</DropdownMenuItem>

				{isDeleted ? (
					<>
						<DropdownMenuItem onClick={stop(() => onRestore(template))}>
							<Icon icon="ri:arrow-go-back-line" className="h-4 w-4" />
							Restaurar
						</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuItem
							onClick={stop(() => onHardDelete(template))}
							className="text-red-600 focus:text-red-600 dark:text-red-400 dark:focus:text-red-400"
						>
							<Icon icon="ri:delete-bin-line" className="h-4 w-4" />
							Eliminar definitivamente
						</DropdownMenuItem>
					</>
				) : (
					<>
						<DropdownMenuItem onClick={stop(() => onEdit(template))}>
							<Icon icon="ri:edit-line" className="h-4 w-4" />
							Ver información
						</DropdownMenuItem>
						{template.template_type === 'pdf' && (
							<DropdownMenuItem
								onClick={stop(() => onMap(template))}
								disabled={!canMap}
							>
								<Icon icon="ri:links-line" className="h-4 w-4" />
								Mapear campos
							</DropdownMenuItem>
						)}

						<DropdownMenuSeparator />

						<DropdownMenuItem onClick={stop(() => onUpload(template))}>
							<Icon icon="ri:upload-2-line" className="h-4 w-4" />
							{template.document ? 'Reemplazar archivo' : 'Subir archivo'}
						</DropdownMenuItem>
						<DropdownMenuItem
							onClick={stop(() => onDownload(template))}
							disabled={!hasFile}
						>
							<Icon icon="ri:download-2-line" className="h-4 w-4" />
							Descargar archivo
						</DropdownMenuItem>
						<DropdownMenuItem onClick={stop(() => onDuplicate(template))}>
							<Icon icon="ri:file-copy-line" className="h-4 w-4" />
							Duplicar
						</DropdownMenuItem>
						<DropdownMenuItem onClick={stop(() => onCopyId(template))}>
							<Icon icon="ri:clipboard-line" className="h-4 w-4" />
							Copiar ID
						</DropdownMenuItem>

						<DropdownMenuSeparator />

						<DropdownMenuItem
							onClick={stop(() => onSoftDelete(template))}
							className="text-red-600 focus:text-red-600 dark:text-red-400 dark:focus:text-red-400"
						>
							<Icon icon="ri:archive-line" className="h-4 w-4" />
							Enviar a papelera
						</DropdownMenuItem>
					</>
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
