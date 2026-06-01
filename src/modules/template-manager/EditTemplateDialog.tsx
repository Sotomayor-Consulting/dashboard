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
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@components/ui/Select';
import { Switch } from '@components/ui/Switch';

import type { TemplateWithDocument } from '@domains/templates/types';
import { getAllEntityTypes, getEntityLabel } from '@domains/templates/entity-registry';
import { listTransformers } from '@domains/templates/transformers';

interface Props {
	template: TemplateWithDocument | null;
	onOpenChange: (open: boolean) => void;
	onSaved: (updated: TemplateWithDocument) => void;
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
	category: string;
	related_to_type: string;
	transformer_id: string;
	source_url: string;
	is_active: boolean;
}

function toDraft(t: TemplateWithDocument): Draft {
	return {
		name: t.name,
		description: t.description ?? '',
		category: t.category ?? '',
		related_to_type: t.related_to_type ?? '',
		transformer_id: t.transformer_id ?? '',
		source_url: t.source_url ?? '',
		is_active: t.is_active,
	};
}

export function EditTemplateDialog({ template, onOpenChange, onSaved }: Props) {
	const [draft, setDraft] = React.useState<Draft | null>(null);
	const [submitting, setSubmitting] = React.useState(false);

	React.useEffect(() => {
		setDraft(template ? toDraft(template) : null);
	}, [template]);

	const update = <K extends keyof Draft>(key: K, value: Draft[K]) =>
		setDraft((prev) => (prev ? { ...prev, [key]: value } : prev));

	const handleSubmit = async (event: React.SyntheticEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (!template || !draft) return;
		if (!draft.name.trim()) {
			toast.error('El nombre es obligatorio');
			return;
		}

		// Solo enviamos campos editables; null cuando el usuario lo dejó vacío.
		const body = {
			name: draft.name.trim(),
			description: draft.description.trim() || null,
			category: draft.category || null,
			related_to_type: draft.related_to_type || null,
			transformer_id: draft.transformer_id || null,
			source_url: draft.source_url.trim() || null,
			is_active: draft.is_active,
		};

		setSubmitting(true);
		const toastId = toast.loading('Guardando cambios...');
		try {
			const res = await fetch(`/api/templates/${template.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body),
			});
			const json = await res.json();
			if (!res.ok) throw new Error(json.error ?? 'Error al guardar');

			// PATCH devuelve la fila sin el documento embebido; recargamos completo.
			const refetch = await fetch(`/api/templates/${template.id}`);
			const rj = await refetch.json();
			onSaved((rj.data ?? json.data) as TemplateWithDocument);
			toast.success('Plantilla actualizada', { id: toastId });
			onOpenChange(false);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Error inesperado', { id: toastId });
		} finally {
			setSubmitting(false);
		}
	};

	if (!draft) return null;

	return (
		<Dialog open={!!template} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-lg">
				<form onSubmit={handleSubmit}>
					<DialogHeader>
						<DialogTitle>Editar plantilla</DialogTitle>
						<DialogDescription>
							Actualiza los datos de "{template?.name}". El tipo y el archivo se gestionan aparte.
						</DialogDescription>
					</DialogHeader>
					<FieldGroup className="grid gap-4 py-4 sm:grid-cols-2">
						<Field className="sm:col-span-2">
							<FieldLabel htmlFor="edit-name">Nombre *</FieldLabel>
							<Input
								id="edit-name"
								value={draft.name}
								onChange={(e) => update('name', e.target.value)}
								required
							/>
						</Field>

						<Field>
							<FieldLabel htmlFor="edit-cat">Categoría</FieldLabel>
							<Select
								value={draft.category || undefined}
								onValueChange={(v) => update('category', v ?? '')}
							>
								<SelectTrigger id="edit-cat" className="w-full">
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

						<Field>
							<FieldLabel htmlFor="edit-entity">Entidad asociada</FieldLabel>
							<Select
								value={draft.related_to_type || undefined}
								onValueChange={(v) => update('related_to_type', v ?? '')}
							>
								<SelectTrigger id="edit-entity" className="w-full">
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

						<Field className="sm:col-span-2">
							<FieldLabel htmlFor="edit-desc">Descripción</FieldLabel>
							<Input
								id="edit-desc"
								value={draft.description}
								onChange={(e) => update('description', e.target.value)}
								placeholder="Descripción opcional"
							/>
						</Field>

						<Field>
							<FieldLabel htmlFor="edit-transformer">Transformer</FieldLabel>
							<Select
								value={draft.transformer_id || undefined}
								onValueChange={(v) => update('transformer_id', v ?? '')}
							>
								<SelectTrigger id="edit-transformer" className="w-full">
									<SelectValue placeholder="— (ninguno)" />
								</SelectTrigger>
								<SelectContent>
									<SelectGroup>
										{listTransformers().map((t) => (
											<SelectItem key={t.id} value={t.id}>
												{t.name}
											</SelectItem>
										))}
									</SelectGroup>
								</SelectContent>
							</Select>
						</Field>

						<Field>
							<FieldLabel htmlFor="edit-url">URL externa</FieldLabel>
							<Input
								id="edit-url"
								value={draft.source_url}
								onChange={(e) => update('source_url', e.target.value)}
								placeholder="https://irs.gov/ss-4.pdf"
							/>
						</Field>

						<Field
							orientation="horizontal"
							className="sm:col-span-2 rounded-lg border border-gray-200 px-3 py-2.5 dark:border-gray-800"
						>
							<Switch
								id="edit-active"
								checked={draft.is_active}
								onCheckedChange={(c) => update('is_active', c === true)}
							/>
							<FieldLabel htmlFor="edit-active" className="!mb-0">
								Plantilla activa
							</FieldLabel>
						</Field>
					</FieldGroup>
					<DialogFooter showCloseButton>
						<Button type="submit" disabled={submitting}>
							{submitting ? 'Guardando…' : 'Guardar cambios'}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
