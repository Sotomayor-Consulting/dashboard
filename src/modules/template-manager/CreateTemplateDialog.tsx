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
import { Switch } from '@components/ui/Switch';
import { DropzoneField } from '@components/ui/DropzoneField';
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@components/ui/Select';

import type { TemplateType, TemplateWithDocument } from '@domains/templates/types';
import { getAllEntityTypes, getEntityLabel } from '@domains/templates/entity-registry';

interface TransformerOption {
	id: string;
	name: string;
	description: string;
	entityType: string;
}

interface Props {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onCreated: (template: TemplateWithDocument) => void;
	transformers: TransformerOption[];
}

const CATEGORY_OPTIONS = [
	{ value: 'incorporation', label: 'Incorporación' },
	{ value: 'contract', label: 'Contrato' },
	{ value: 'tax', label: 'Impuestos' },
	{ value: 'general', label: 'General' },
] as const;

interface Draft {
	name: string;
	description: string;
	template_type: TemplateType;
	category: string;
	related_to_type: string;
	transformer_id: string;
	source_url: string;
}

const EMPTY: Draft = {
	name: '',
	description: '',
	template_type: 'pdf',
	category: '',
	related_to_type: '',
	transformer_id: '',
	source_url: '',
};

export function CreateTemplateDialog({ open, onOpenChange, onCreated, transformers }: Props) {
	const [draft, setDraft] = React.useState<Draft>(EMPTY);
	const [file, setFile] = React.useState<File | null>(null);
	const [uploadMode, setUploadMode] = React.useState<'file' | 'url'>('file');
	const [submitting, setSubmitting] = React.useState(false);

	React.useEffect(() => {
		if (!open) {
			setDraft(EMPTY);
			setFile(null);
			setUploadMode('file');
		}
	}, [open]);

	const update = <K extends keyof Draft>(key: K, value: Draft[K]) =>
		setDraft((prev) => ({ ...prev, [key]: value }));

	const handleSubmit = async (event: React.SyntheticEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (!draft.name.trim()) {
			toast.error('El nombre es obligatorio');
			return;
		}

		const body: Record<string, unknown> = {
			name: draft.name.trim(),
			template_type: draft.template_type,
		};
		if (draft.description) body.description = draft.description;
		if (draft.category) body.category = draft.category;
		if (draft.related_to_type) body.related_to_type = draft.related_to_type;
		if (draft.transformer_id) body.transformer_id = draft.transformer_id;
		if (draft.source_url) body.source_url = draft.source_url;

		setSubmitting(true);
		const toastId = toast.loading('Creando plantilla...');
		try {
			const res = await fetch('/api/templates', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body),
			});
			const json = await res.json();
			if (!res.ok) throw new Error(json.error ?? 'Error al crear');

			let created = json.data as TemplateWithDocument;

			// Subir el archivo en el mismo flujo de creación (opcional).
			if (file) {
				toast.loading('Subiendo archivo...', { id: toastId });
				const fd = new FormData();
				fd.append('file', file);
				const upRes = await fetch(`/api/templates/${created.id}/upload`, {
					method: 'POST',
					body: fd,
				});
				const upJson = await upRes.json();
				if (!upRes.ok) {
					// La plantilla quedó creada; avisamos que el archivo falló.
					onCreated(created);
					throw new Error(upJson.error ?? 'Plantilla creada, pero falló la subida del archivo');
				}
				if (upJson.data) created = upJson.data as TemplateWithDocument;
			}

			onCreated(created);
			toast.success(file ? 'Plantilla creada con archivo' : 'Plantilla creada', { id: toastId });
			onOpenChange(false);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Error inesperado', { id: toastId });
		} finally {
			setSubmitting(false);
		}
	};

	const accept = draft.template_type === 'pdf' ? '.pdf' : '.docx';

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-lg">
				<form onSubmit={handleSubmit}>
					<DialogHeader>
						<DialogTitle>Nueva plantilla</DialogTitle>
						<DialogDescription>
							Define la metadata y selecciona el archivo o la URL de la plantilla.
						</DialogDescription>
					</DialogHeader>
					<FieldGroup className="grid gap-4 py-4 sm:grid-cols-2">
						<Field className="sm:col-span-2">
							<FieldLabel htmlFor="tpl-name">Nombre *</FieldLabel>
							<Input
								id="tpl-name"
								value={draft.name}
								onChange={(e) => update('name', e.target.value)}
								required
								placeholder="ej. Operating Agreement"
							/>
						</Field>

						<Field>
							<FieldLabel htmlFor="tpl-type">Tipo *</FieldLabel>
							<Select
								value={draft.template_type}
								onValueChange={(v) => {
									update('template_type', (v ?? 'pdf') as TemplateType);
									setFile(null);
									setUploadMode('file');
								}}
							>
								<SelectTrigger id="tpl-type" className="w-full">
									<SelectValue placeholder="Selecciona el tipo" />
								</SelectTrigger>
								<SelectContent>
									<SelectGroup>
										<SelectItem value="pdf">PDF (AcroForm)</SelectItem>
										<SelectItem value="word">Word (Carbone)</SelectItem>
									</SelectGroup>
								</SelectContent>
							</Select>
						</Field>

						<Field>
							<FieldLabel htmlFor="tpl-cat">Categoría</FieldLabel>
							<Select
								value={draft.category || undefined}
								onValueChange={(v) => update('category', v ?? '')}
							>
								<SelectTrigger id="tpl-cat" className="w-full">
									<SelectValue placeholder="— (ninguna)" />
								</SelectTrigger>
								<SelectContent>
									<SelectGroup>
										{CATEGORY_OPTIONS.map((opt) => (
											<SelectItem key={opt.value} value={opt.value}>
												{opt.label}
											</SelectItem>
										))}
									</SelectGroup>
								</SelectContent>
							</Select>
						</Field>

						<Field className="sm:col-span-2">
							<FieldLabel htmlFor="tpl-desc">Descripción</FieldLabel>
							<Input
								id="tpl-desc"
								value={draft.description}
								onChange={(e) => update('description', e.target.value)}
								placeholder="Descripción opcional"
							/>
						</Field>

						<Field>
							<FieldLabel htmlFor="tpl-entity">Entidad asociada</FieldLabel>
							<Select
								value={draft.related_to_type || undefined}
								onValueChange={(v) => update('related_to_type', v ?? '')}
							>
								<SelectTrigger id="tpl-entity" className="w-full">
									<SelectValue placeholder="— (ninguna)" />
								</SelectTrigger>
								<SelectContent>
									<SelectGroup>
										{getAllEntityTypes().map((et) => (
											<SelectItem key={et} value={et}>
												{getEntityLabel(et)}
											</SelectItem>
										))}
									</SelectGroup>
								</SelectContent>
							</Select>
						</Field>

						<Field>
							<FieldLabel htmlFor="tpl-transformer">Transformer</FieldLabel>
							<Select
								value={draft.transformer_id || undefined}
								onValueChange={(v) => update('transformer_id', v ?? '')}
							>
								<SelectTrigger id="tpl-transformer" className="w-full">
									<SelectValue placeholder="— (ninguno)" />
								</SelectTrigger>
								<SelectContent>
									<SelectGroup>
										{transformers.map((t) => (
											<SelectItem key={t.id} value={t.id}>
												{t.name}
											</SelectItem>
										))}
									</SelectGroup>
								</SelectContent>
							</Select>
						</Field>

						<Field
							orientation="horizontal"
							className="sm:col-span-2 rounded-lg border px-3 py-2.5"
						>
							<Switch
								id="tpl-upload-mode"
								checked={uploadMode === 'url'}
								onCheckedChange={(checked) => {
									setUploadMode(checked ? 'url' : 'file');
									if (checked) setFile(null);
									else update('source_url', '');
								}}
							/>
							<FieldLabel htmlFor="tpl-upload-mode" className="!mb-0">
								{uploadMode === 'file' ? 'Subir archivo' : 'Usar URL'}
							</FieldLabel>
						</Field>

						{uploadMode === 'url' ? (
							<Field className="sm:col-span-2">
								<FieldLabel htmlFor="tpl-url">URL externa</FieldLabel>
								<Input
									id="tpl-url"
									value={draft.source_url}
									onChange={(e) => update('source_url', e.target.value)}
									placeholder="https://..."
								/>
							</Field>
						) : (
							<Field className="sm:col-span-2">
								<DropzoneField
									key={draft.template_type}
									accept={accept}
									maxFileSizeMb={25}
									title={draft.template_type === 'pdf' ? 'Archivo PDF' : 'Archivo Word (.docx)'}
									description="Arrastra y suelta o haz clic para seleccionar."
									helperText={`Formatos: ${accept}. Tamaño máximo: 25 MB.`}
									showFileList
									onFilesChange={(files) => setFile(files[0] ?? null)}
								/>
							</Field>
						)}
					</FieldGroup>
					<DialogFooter showCloseButton>
						<Button type="submit" disabled={submitting}>
							{submitting ? 'Creando…' : 'Crear plantilla'}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
