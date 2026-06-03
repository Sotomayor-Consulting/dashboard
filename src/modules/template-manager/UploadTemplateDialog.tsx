import * as React from 'react';
import { toast } from 'sonner';

import { Button } from '@components/ui/Button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@components/ui/Dialog';
import { DropzoneField } from '@components/ui/DropzoneField';

import type { TemplateWithDocument } from '@domains/templates/types';

interface Props {
	template: TemplateWithDocument | null;
	onOpenChange: (open: boolean) => void;
	onUploaded: (updated: TemplateWithDocument) => void;
}

const ACCEPT_MAP: Record<string, string> = {
	pdf: '.pdf',
	word: '.docx',
};

export function UploadTemplateDialog({ template, onOpenChange, onUploaded }: Props) {
	const [file, setFile] = React.useState<File | null>(null);
	const [submitting, setSubmitting] = React.useState(false);

	const accept = template ? ACCEPT_MAP[template.template_type] ?? '.pdf,.docx' : '.pdf,.docx';
	const title = template?.template_type === 'pdf' ? 'Archivo PDF' : 'Archivo Word (.docx)';

	const handleUpload = async () => {
		if (!template) return;
		if (!file) {
			toast.error('Selecciona un archivo');
			return;
		}

		setSubmitting(true);
		const toastId = toast.loading('Subiendo archivo...');
		try {
			const fd = new FormData();
			fd.append('file', file);
			const res = await fetch(`/api/templates/${template.id}/upload`, {
				method: 'POST',
				body: fd,
			});
			const json = await res.json();
			if (!res.ok) throw new Error(json.error ?? 'Error al subir');
			toast.success('Archivo subido', { id: toastId });
			if (json.data) onUploaded(json.data as TemplateWithDocument);
			onOpenChange(false);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Error inesperado', { id: toastId });
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<Dialog open={!!template} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>{template?.document ? 'Reemplazar archivo' : 'Subir archivo'}</DialogTitle>
					<DialogDescription>
						{template ? `Selecciona el archivo para "${template.name}".` : null}
					</DialogDescription>
				</DialogHeader>
				<div className="py-4">
					<DropzoneField
						key={template?.id ?? 'none'}
						accept={accept}
						maxFileSizeMb={25}
						title={title}
						description="Arrastra y suelta o haz clic para seleccionar."
						helperText={`Formatos: ${accept}. Tamaño máximo: 25 MB.`}
						showFileList
						onFilesChange={(files) => setFile(files[0] ?? null)}
					/>
				</div>
				<DialogFooter showCloseButton>
					<Button onClick={handleUpload} disabled={submitting || !file}>
						{submitting ? 'Subiendo…' : 'Subir'}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
