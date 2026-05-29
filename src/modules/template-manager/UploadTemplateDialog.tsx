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
import { Field, FieldGroup, FieldLabel } from '@components/ui/Field';
import { Input } from '@components/ui/Input';

import type { TemplateWithDocument } from '@domains/templates/types';

interface Props {
	template: TemplateWithDocument | null;
	onOpenChange: (open: boolean) => void;
	onUploaded: (updated: TemplateWithDocument) => void;
}

export function UploadTemplateDialog({ template, onOpenChange, onUploaded }: Props) {
	const [file, setFile] = React.useState<File | null>(null);
	const [submitting, setSubmitting] = React.useState(false);

	React.useEffect(() => {
		if (!template) setFile(null);
	}, [template]);

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
				<FieldGroup className="py-4">
					<Field>
						<FieldLabel htmlFor="upload-file">
							Archivo {template?.template_type === 'pdf' ? 'PDF' : 'Word (.docx)'}
						</FieldLabel>
						<Input
							id="upload-file"
							type="file"
							accept={template?.template_type === 'pdf' ? '.pdf' : '.docx'}
							onChange={(e) => setFile(e.target.files?.[0] ?? null)}
						/>
					</Field>
				</FieldGroup>
				<DialogFooter showCloseButton>
					<Button onClick={handleUpload} disabled={submitting || !file}>
						{submitting ? 'Subiendo…' : 'Subir'}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
