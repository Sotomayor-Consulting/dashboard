import * as React from 'react';
import { toast } from 'sonner';
import { Icon } from '@iconify/react';

import { Badge } from '@components/ui/Badge';
import { Button } from '@components/ui/Button';
import { Input } from '@components/ui/Input';
import { Field, FieldGroup, FieldLabel } from '@components/ui/Field';
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@components/ui/Select';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@components/ui/Table';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@components/ui/Dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@components/ui/Tooltip';

import type { TemplateWithDocument, TemplateType } from '@domains/templates/types';
import {
	getAllEntityTypes,
	getEntityLabel,
	type EntityType,
} from '@domains/templates/entity-registry';

import TemplateMappingEditor from './TemplateMappingEditor';

interface Props {
	data: TemplateWithDocument[];
}

const PAGE_SIZE = 10;

const CATEGORY_OPTIONS = [
	{ value: 'incorporation', label: 'Incorporación' },
	{ value: 'contract', label: 'Contrato' },
	{ value: 'tax', label: 'Impuestos' },
	{ value: 'general', label: 'General' },
] as const;

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

const typeBadgeClass: Record<string, string> = {
	word: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
	pdf: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

const catBadgeClass: Record<string, string> = {
	incorporation: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
	contract: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
	tax: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
	general: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
};

interface CreateDraft {
	name: string;
	description: string;
	template_type: TemplateType;
	category: string;
	related_to_type: string;
	source_url: string;
}

const EMPTY_DRAFT: CreateDraft = {
	name: '',
	description: '',
	template_type: 'pdf',
	category: '',
	related_to_type: '',
	source_url: '',
};

export default function TemplateManagerPanel({ data }: Props) {
	const [query, setQuery] = React.useState('');
	const [page, setPage] = React.useState(1);
	const [templates, setTemplates] = React.useState(data);
	const [openCreate, setOpenCreate] = React.useState(false);
	const [openUpload, setOpenUpload] = React.useState<{ id: string; name: string; type: TemplateType } | null>(null);
	const [openDelete, setOpenDelete] = React.useState<{ id: string; name: string } | null>(null);
	const [openMapping, setOpenMapping] = React.useState<TemplateWithDocument | null>(null);
	const [draft, setDraft] = React.useState<CreateDraft>(EMPTY_DRAFT);
	const [uploadFile, setUploadFile] = React.useState<File | null>(null);
	const [submitting, setSubmitting] = React.useState(false);

	const filtered = React.useMemo(() => {
		const q = query.trim().toLowerCase();
		if (!q) return templates;
		return templates.filter((t) =>
			[t.name, t.category, t.template_type, t.related_to_type, t.description]
				.filter(Boolean)
				.some((v) => String(v).toLowerCase().includes(q)),
		);
	}, [templates, query]);

	const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
	const currentPage = Math.min(page, totalPages);
	const start = (currentPage - 1) * PAGE_SIZE;
	const rows = filtered.slice(start, start + PAGE_SIZE);

	React.useEffect(() => {
		setPage(1);
	}, [query]);

	React.useEffect(() => {
		if (!openUpload) setUploadFile(null);
	}, [openUpload]);

	const updateDraft = <K extends keyof CreateDraft>(key: K, value: CreateDraft[K]) =>
		setDraft((prev) => ({ ...prev, [key]: value }));

	async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
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
			setTemplates((prev) => [json.data, ...prev]);
			toast.success('Plantilla creada', { id: toastId });
			setOpenCreate(false);
			setDraft(EMPTY_DRAFT);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Error inesperado', { id: toastId });
		} finally {
			setSubmitting(false);
		}
	}

	async function handleUpload() {
		if (!openUpload) return;
		if (!uploadFile) {
			toast.error('Selecciona un archivo');
			return;
		}

		setSubmitting(true);
		const toastId = toast.loading('Subiendo archivo...');
		try {
			const fd = new FormData();
			fd.append('file', uploadFile);
			const res = await fetch(`/api/templates/${openUpload.id}/upload`, { method: 'POST', body: fd });
			const json = await res.json();
			if (!res.ok) throw new Error(json.error ?? 'Error al subir');
			toast.success('Archivo subido', { id: toastId });
			if (json.data) {
				setTemplates((prev) => prev.map((t) => (t.id === openUpload.id ? json.data : t)));
			}
			setOpenUpload(null);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Error inesperado', { id: toastId });
		} finally {
			setSubmitting(false);
		}
	}

	async function handleSoftDelete(id: string) {
		const toastId = toast.loading('Eliminando...');
		try {
			const res = await fetch(`/api/templates/${id}`, { method: 'DELETE' });
			const json = await res.json();
			if (!res.ok) throw new Error(json.error ?? 'Error');
			setTemplates((prev) =>
				prev.map((t) =>
					t.id === id ? { ...t, is_active: false, deleted_at: new Date().toISOString() } : t,
				),
			);
			toast.success('Plantilla enviada a papelera', { id: toastId });
			setOpenDelete(null);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Error', { id: toastId });
		}
	}

	async function handlePermanentDelete(id: string) {
		const toastId = toast.loading('Eliminando permanentemente...');
		try {
			const res = await fetch(`/api/templates/${id}?permanent=true`, { method: 'DELETE' });
			const json = await res.json();
			if (!res.ok) throw new Error(json.error ?? 'Error');
			setTemplates((prev) => prev.filter((t) => t.id !== id));
			toast.success('Plantilla eliminada permanentemente', { id: toastId });
			setOpenDelete(null);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Error', { id: toastId });
		}
	}

	async function handleRestore(id: string) {
		const toastId = toast.loading('Restaurando...');
		try {
			const res = await fetch(`/api/templates/${id}/restore`, { method: 'POST' });
			const json = await res.json();
			if (!res.ok) throw new Error(json.error ?? 'Error');
			setTemplates((prev) =>
				prev.map((t) => (t.id === id ? { ...t, is_active: true, deleted_at: null } : t)),
			);
			toast.success('Plantilla restaurada', { id: toastId });
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Error', { id: toastId });
		}
	}

	return (
		<TooltipProvider>
			<div className="space-y-6 p-4 lg:p-6">
				<header className="flex flex-wrap items-start justify-between gap-4">
					<div>
						<h1 className="text-2xl font-semibold tracking-tight">Plantillas</h1>
						<p className="text-muted-foreground text-sm">
							Gestiona las plantillas de documentos PDF y Word para generar entregables.
						</p>
					</div>
					<Dialog open={openCreate} onOpenChange={setOpenCreate}>
						<DialogTrigger
							render={
								<Button>
									<Icon icon="ri:add-line" className="h-4 w-4" />
									Nueva plantilla
								</Button>
							}
						/>
						<DialogContent className="sm:max-w-lg">
							<form onSubmit={handleCreate}>
								<DialogHeader>
									<DialogTitle>Nueva plantilla</DialogTitle>
									<DialogDescription>
										Crea la metadata de la plantilla. El archivo se sube en un segundo paso.
									</DialogDescription>
								</DialogHeader>
								<FieldGroup className="grid gap-4 py-4 sm:grid-cols-2">
									<Field className="sm:col-span-2">
										<FieldLabel htmlFor="tpl-name">Nombre *</FieldLabel>
										<Input
											id="tpl-name"
											value={draft.name}
											onChange={(e) => updateDraft('name', e.target.value)}
											required
											placeholder="ej. Operating Agreement"
										/>
									</Field>

									<Field>
										<FieldLabel htmlFor="tpl-type">Tipo *</FieldLabel>
										<Select
											value={draft.template_type}
											onValueChange={(v) => updateDraft('template_type', (v ?? 'pdf') as TemplateType)}
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
											onValueChange={(v) => updateDraft('category', v ?? '')}
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
											onChange={(e) => updateDraft('description', e.target.value)}
											placeholder="Descripción opcional"
										/>
									</Field>

									<Field>
										<FieldLabel htmlFor="tpl-entity">Entidad asociada</FieldLabel>
										<Select
											value={draft.related_to_type || undefined}
											onValueChange={(v) => updateDraft('related_to_type', v ?? '')}
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
										<FieldLabel htmlFor="tpl-url">URL externa</FieldLabel>
										<Input
											id="tpl-url"
											value={draft.source_url}
											onChange={(e) => updateDraft('source_url', e.target.value)}
											placeholder="https://irs.gov/ss-4.pdf"
										/>
									</Field>
								</FieldGroup>
								<DialogFooter showCloseButton>
									<Button type="submit" disabled={submitting}>
										{submitting ? 'Creando…' : 'Crear plantilla'}
									</Button>
								</DialogFooter>
							</form>
						</DialogContent>
					</Dialog>
				</header>

				<div className="relative w-full max-w-sm">
					<Icon
						icon="ri:search-line"
						className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
					/>
					<Input
						placeholder="Buscar plantilla..."
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						className="pl-9"
					/>
				</div>

				<div className="overflow-hidden rounded-xl border">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Nombre</TableHead>
								<TableHead>Tipo</TableHead>
								<TableHead>Categoría</TableHead>
								<TableHead>Entidad</TableHead>
								<TableHead>Archivo</TableHead>
								<TableHead>Estado</TableHead>
								<TableHead className="text-right">Acciones</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{rows.length === 0 && (
								<TableRow>
									<TableCell colSpan={7} className="text-muted-foreground py-8 text-center">
										{query ? 'Sin resultados' : 'No hay plantillas. Crea la primera.'}
									</TableCell>
								</TableRow>
							)}
							{rows.map((t) => {
								const isDeleted = !!t.deleted_at;
								const isInactive = !t.is_active && !isDeleted;
								const canMap = !!(t.document || t.source_url);
								return (
									<TableRow key={t.id} className={isDeleted ? 'opacity-50' : ''}>
										<TableCell className="font-medium">{t.name}</TableCell>
										<TableCell>
											<Badge className={typeBadgeClass[t.template_type]}>
												{t.template_type}
											</Badge>
										</TableCell>
										<TableCell>
											{t.category ? (
												<Badge className={catBadgeClass[t.category] ?? ''}>{t.category}</Badge>
											) : (
												<span className="text-muted-foreground">—</span>
											)}
										</TableCell>
										<TableCell className="text-muted-foreground text-xs">
											{t.related_to_type ? getEntityLabel(t.related_to_type as EntityType) : '—'}
										</TableCell>
										<TableCell className="text-muted-foreground text-xs">
											{t.document ? (
												<span title={t.document.file_name}>
													{fmtBytes(t.document.file_size_bytes)}
												</span>
											) : t.source_url ? (
												<Badge variant="outline" className="gap-1">
													<Icon icon="ri:link" className="h-3 w-3" />
													URL
												</Badge>
											) : (
												<span className="text-muted-foreground">—</span>
											)}
										</TableCell>
										<TableCell>
											{isDeleted ? (
												<Badge variant="destructive">Eliminada</Badge>
											) : isInactive ? (
												<Badge variant="secondary">Inactiva</Badge>
											) : (
												<Badge variant="default">Activa</Badge>
											)}
										</TableCell>
										<TableCell className="text-right">
											<div className="flex items-center justify-end gap-1">
												{isDeleted ? (
													<>
														<Button
															size="sm"
															variant="outline"
															onClick={() => handleRestore(t.id)}
														>
															<Icon icon="ri:arrow-go-back-line" className="h-4 w-4" />
															Restaurar
														</Button>
														<Button
															size="sm"
															variant="destructive"
															onClick={() => setOpenDelete({ id: t.id, name: t.name })}
														>
															<Icon icon="ri:delete-bin-line" className="h-4 w-4" />
															Eliminar
														</Button>
													</>
												) : (
													<>
														<Button
															size="sm"
															variant="outline"
															onClick={() => setOpenUpload({ id: t.id, name: t.name, type: t.template_type })}
														>
															<Icon icon="ri:upload-2-line" className="h-4 w-4" />
															Subir
														</Button>
														{t.template_type === 'pdf' && (
															<Tooltip>
																<TooltipTrigger
																	render={
																		<Button
																			size="sm"
																			variant="outline"
																			disabled={!canMap}
																			onClick={() => canMap && setOpenMapping(t)}
																		>
																			<Icon icon="ri:links-line" className="h-4 w-4" />
																			Mapear
																		</Button>
																	}
																/>
																<TooltipContent>
																	{canMap
																		? 'Mapear campos del PDF a datos'
																		: 'Sube primero el PDF para mapear campos'}
																</TooltipContent>
															</Tooltip>
														)}
														<Button
															size="sm"
															variant="outline"
															onClick={() => setOpenDelete({ id: t.id, name: t.name })}
														>
															<Icon icon="ri:delete-bin-line" className="h-4 w-4" />
															Desactivar
														</Button>
													</>
												)}
											</div>
										</TableCell>
									</TableRow>
								);
							})}
						</TableBody>
					</Table>
				</div>

				{totalPages > 1 && (
					<div className="flex items-center justify-center gap-2">
						<Button
							size="sm"
							variant="outline"
							disabled={currentPage <= 1}
							onClick={() => setPage((p) => p - 1)}
						>
							<Icon icon="ri:arrow-left-s-line" className="h-4 w-4" />
							Anterior
						</Button>
						<span className="text-muted-foreground text-sm">
							{currentPage} / {totalPages}
						</span>
						<Button
							size="sm"
							variant="outline"
							disabled={currentPage >= totalPages}
							onClick={() => setPage((p) => p + 1)}
						>
							Siguiente
							<Icon icon="ri:arrow-right-s-line" className="h-4 w-4" />
						</Button>
					</div>
				)}

				{/* Upload dialog */}
				<Dialog
					open={!!openUpload}
					onOpenChange={(o) => {
						if (!o) setOpenUpload(null);
					}}
				>
					<DialogContent className="sm:max-w-md">
						<DialogHeader>
							<DialogTitle>Subir archivo</DialogTitle>
							<DialogDescription>
								{openUpload ? `Selecciona el archivo para "${openUpload.name}".` : null}
							</DialogDescription>
						</DialogHeader>
						<FieldGroup className="py-4">
							<Field>
								<FieldLabel htmlFor="upload-file">
									Archivo {openUpload?.type === 'pdf' ? 'PDF' : 'Word (.docx)'}
								</FieldLabel>
								<Input
									id="upload-file"
									type="file"
									accept={openUpload?.type === 'pdf' ? '.pdf' : '.docx'}
									onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
								/>
							</Field>
						</FieldGroup>
						<DialogFooter showCloseButton>
							<Button onClick={handleUpload} disabled={submitting || !uploadFile}>
								{submitting ? 'Subiendo…' : 'Subir'}
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>

				{/* Delete confirmation dialog */}
				<Dialog
					open={!!openDelete}
					onOpenChange={(o) => {
						if (!o) setOpenDelete(null);
					}}
				>
					<DialogContent className="sm:max-w-md">
						<DialogHeader>
							<DialogTitle>Confirmar eliminación</DialogTitle>
							<DialogDescription>
								{openDelete ? (
									<>
										¿Qué deseas hacer con <strong>{openDelete.name}</strong>?
									</>
								) : null}
							</DialogDescription>
						</DialogHeader>
						<div className="flex flex-col gap-3 py-2">
							<Button
								variant="secondary"
								onClick={() => openDelete && handleSoftDelete(openDelete.id)}
							>
								<Icon icon="ri:archive-line" className="h-4 w-4" />
								Enviar a papelera
							</Button>
							<Button
								variant="destructive"
								onClick={() => openDelete && handlePermanentDelete(openDelete.id)}
							>
								<Icon icon="ri:delete-bin-line" className="h-4 w-4" />
								Eliminar permanentemente
							</Button>
						</div>
						<DialogFooter showCloseButton />
					</DialogContent>
				</Dialog>

				{openMapping && (
					<TemplateMappingEditor
						template={openMapping}
						open={!!openMapping}
						onOpenChange={(o) => {
							if (!o) setOpenMapping(null);
						}}
						onSaved={(updated) => {
							setTemplates((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
							setOpenMapping(null);
						}}
					/>
				)}
			</div>
		</TooltipProvider>
	);
}
