import '@shared/iconify-ri'; // Registra el set `ri` (Remix Icons) para esta isla.

import * as React from 'react';
import { Icon } from '@iconify/react';
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

import type { TemplateWithDocument } from '@domains/templates/types';
import { getEntityLabel, type EntityType } from '@domains/templates/entity-registry';

import { CreateTemplateDialog } from '../CreateTemplateDialog';
import { EditTemplateDialog } from '../EditTemplateDialog';
import { TablePagination } from '../TablePagination';
import { TemplateDetailSheet } from '../TemplateDetailSheet';
import {
	TemplatesTable,
	type TemplatesSortDir,
	type TemplatesSortKey,
} from '../TemplatesTable';
import {
	FILTERS,
	TemplatesToolbar,
	type ColumnId,
	type TemplateFilter,
} from '../TemplatesToolbar';
import { UploadTemplateDialog } from '../UploadTemplateDialog';
import TemplateMappingEditor from './TemplateMappingEditor';

interface TransformerOption {
	id: string;
	name: string;
	description: string;
	entityType: string;
}

interface Props {
	data: TemplateWithDocument[];
	transformers: TransformerOption[];
}

const DEFAULT_VISIBLE: Record<ColumnId, boolean> = {
	category: true,
	entity: true,
	file: true,
	status: true,
	actions: true,
};

const PAGE_SIZE = 20;

function matchSearch(t: TemplateWithDocument, q: string): boolean {
	if (!q) return true;
	const haystack = [
		t.name,
		t.description ?? '',
		t.category ?? '',
		t.related_to_type ?? '',
		t.related_to_type ? getEntityLabel(t.related_to_type as EntityType) : '',
		t.template_type,
	]
		.join(' ')
		.toLowerCase();
	return haystack.includes(q);
}

export default function TemplateManagerPanel({ data, transformers }: Props) {
	const transformerMap = React.useMemo(
		() => Object.fromEntries(transformers.map((t) => [t.id, t])),
		[transformers],
	);
	const [templates, setTemplates] = React.useState(data);
	const [filter, setFilter] = React.useState<TemplateFilter>('todas');
	const [search, setSearch] = React.useState('');
	const [visibleColumns, setVisibleColumns] = React.useState(DEFAULT_VISIBLE);
	const toggleColumn = (id: ColumnId) =>
		setVisibleColumns((prev) => ({ ...prev, [id]: !prev[id] }));

	const [sort, setSort] = React.useState<{ key: TemplatesSortKey; dir: TemplatesSortDir }>({
		key: 'name',
		dir: 'asc',
	});
	const onSort = (key: TemplatesSortKey) => {
		setSort((prev) =>
			prev.key === key
				? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
				: { key, dir: 'asc' },
		);
	};

	const [page, setPage] = React.useState(1);
	const [pageSize, setPageSize] = React.useState(PAGE_SIZE);
	React.useEffect(() => {
		setPage(1);
		setSelectedIds(new Set());
	}, [filter, search, pageSize]);

	const [openCreate, setOpenCreate] = React.useState(false);
	const [openDetail, setOpenDetail] = React.useState<TemplateWithDocument | null>(null);
	const [openEdit, setOpenEdit] = React.useState<TemplateWithDocument | null>(null);
	const [openUpload, setOpenUpload] = React.useState<TemplateWithDocument | null>(null);
	const [openMapping, setOpenMapping] = React.useState<TemplateWithDocument | null>(null);
	const [openConfirm, setOpenConfirm] = React.useState<{
		template: TemplateWithDocument;
		mode: 'soft' | 'hard';
	} | null>(null);

	/** Actualiza la lista y, si el detalle abierto es la misma plantilla, lo sincroniza. */
	const applyUpdate = (updated: TemplateWithDocument) => {
		setTemplates((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
		setOpenDetail((prev) => (prev && prev.id === updated.id ? updated : prev));
	};

	// Selección por checkbox
	const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
	const isSelected = (id: string) => selectedIds.has(id);
	const toggleRow = (id: string) =>
		setSelectedIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});

	const filtered = React.useMemo(() => {
		const def = FILTERS.find((f) => f.id === filter);
		const q = search.trim().toLowerCase();
		return templates.filter((t) => (def?.match(t) ?? true) && matchSearch(t, q));
	}, [templates, filter, search]);

	const sorted = React.useMemo(() => {
		const list = [...filtered];
		const cmp = (a: TemplateWithDocument, b: TemplateWithDocument): number => {
			let av: string | number = '';
			let bv: string | number = '';
			switch (sort.key) {
				case 'name':
					av = a.name.toLowerCase();
					bv = b.name.toLowerCase();
					break;
				case 'type':
					av = a.template_type;
					bv = b.template_type;
					break;
				case 'category':
					av = (a.category ?? '').toLowerCase();
					bv = (b.category ?? '').toLowerCase();
					break;
				case 'entity':
					av = (a.related_to_type ?? '').toLowerCase();
					bv = (b.related_to_type ?? '').toLowerCase();
					break;
				case 'status':
					av = a.deleted_at ? 2 : a.is_active ? 0 : 1;
					bv = b.deleted_at ? 2 : b.is_active ? 0 : 1;
					break;
				case 'created':
					av = Date.parse(a.created_at);
					bv = Date.parse(b.created_at);
					break;
			}
			if (av < bv) return sort.dir === 'asc' ? -1 : 1;
			if (av > bv) return sort.dir === 'asc' ? 1 : -1;
			return 0;
		};
		return list.sort(cmp);
	}, [filtered, sort]);

	const paginated = React.useMemo(() => {
		const start = (page - 1) * pageSize;
		return sorted.slice(start, start + pageSize);
	}, [sorted, page, pageSize]);

	const visibleIds = React.useMemo(() => paginated.map((t) => t.id), [paginated]);
	const selectionMode: 'none' | 'some' | 'all' = React.useMemo(() => {
		if (visibleIds.length === 0) return 'none';
		const count = visibleIds.filter((id) => selectedIds.has(id)).length;
		if (count === 0) return 'none';
		return count === visibleIds.length ? 'all' : 'some';
	}, [visibleIds, selectedIds]);
	const toggleAll = () =>
		setSelectedIds((prev) => {
			const allSelected = visibleIds.length > 0 && visibleIds.every((id) => prev.has(id));
			const next = new Set(prev);
			if (allSelected) visibleIds.forEach((id) => next.delete(id));
			else visibleIds.forEach((id) => next.add(id));
			return next;
		});

	const totals = React.useMemo(
		() => ({
			total: templates.filter((t) => !t.deleted_at).length,
			pdf: templates.filter((t) => !t.deleted_at && t.template_type === 'pdf').length,
			word: templates.filter((t) => !t.deleted_at && t.template_type === 'word').length,
			deleted: templates.filter((t) => !!t.deleted_at).length,
		}),
		[templates],
	);

	// ── Mutations ───────────────────────────────────────────────────────────
	const handleSoftDelete = async (id: string) => {
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
			setOpenDetail((prev) =>
				prev && prev.id === id
					? { ...prev, is_active: false, deleted_at: new Date().toISOString() }
					: prev,
			);
			toast.success('Plantilla enviada a papelera', { id: toastId });
			setOpenConfirm(null);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Error', { id: toastId });
		}
	};

	const handleHardDelete = async (id: string) => {
		const toastId = toast.loading('Eliminando permanentemente...');
		try {
			const res = await fetch(`/api/templates/${id}?permanent=true`, { method: 'DELETE' });
			const json = await res.json();
			if (!res.ok) throw new Error(json.error ?? 'Error');
			setTemplates((prev) => prev.filter((t) => t.id !== id));
			setOpenDetail((prev) => (prev && prev.id === id ? null : prev));
			toast.success('Plantilla eliminada permanentemente', { id: toastId });
			setOpenConfirm(null);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Error', { id: toastId });
		}
	};

	const handleRestore = async (t: TemplateWithDocument) => {
		const toastId = toast.loading('Restaurando...');
		try {
			const res = await fetch(`/api/templates/${t.id}/restore`, { method: 'POST' });
			const json = await res.json();
			if (!res.ok) throw new Error(json.error ?? 'Error');
			setTemplates((prev) =>
				prev.map((it) => (it.id === t.id ? { ...it, is_active: true, deleted_at: null } : it)),
			);
			setOpenDetail((prev) =>
				prev && prev.id === t.id ? { ...prev, is_active: true, deleted_at: null } : prev,
			);
			toast.success('Plantilla restaurada', { id: toastId });
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Error', { id: toastId });
		}
	};

	const handleDownload = async (t: TemplateWithDocument) => {
		const toastId = toast.loading('Preparando descarga...');
		try {
			const res = await fetch(`/api/templates/${t.id}/download`);
			const json = await res.json();
			if (!res.ok || !json.url) throw new Error(json.error ?? 'No se pudo descargar');
			toast.dismiss(toastId);
			window.open(json.url as string, '_blank', 'noopener');
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Error', { id: toastId });
		}
	};

	const handleDuplicate = async (t: TemplateWithDocument) => {
		const toastId = toast.loading('Duplicando...');
		try {
			const body: Record<string, unknown> = {
				name: `${t.name} (copia)`,
				template_type: t.template_type,
			};
			if (t.description) body.description = t.description;
			if (t.category) body.category = t.category;
			if (t.related_to_type) body.related_to_type = t.related_to_type;
			if (t.transformer_id) body.transformer_id = t.transformer_id;
			if (t.source_url) body.source_url = t.source_url;
			if (t.field_mapping && Object.keys(t.field_mapping).length > 0) {
				body.field_mapping = t.field_mapping;
			}
			if (t.field_definitions && t.field_definitions.length > 0) {
				body.field_definitions = t.field_definitions;
			}

			const res = await fetch('/api/templates', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body),
			});
			const json = await res.json();
			if (!res.ok) throw new Error(json.error ?? 'Error al duplicar');
			setTemplates((prev) => [json.data as TemplateWithDocument, ...prev]);
			toast.success('Plantilla duplicada (sin archivo, súbelo aparte)', { id: toastId });
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Error', { id: toastId });
		}
	};

	const handleCopyId = (t: TemplateWithDocument) => {
		if (typeof navigator !== 'undefined' && navigator.clipboard) {
			void navigator.clipboard.writeText(t.id);
			toast.success('ID copiado al portapapeles');
		}
	};

	// Click en la fila → abre la vista dedicada de la plantilla.
	const handleRowClick = (t: TemplateWithDocument) => setOpenDetail(t);

	return (
		<div className="flex min-h-full flex-col">
			{/* Header */}
			<header className="flex items-end justify-between gap-4 border-b border-gray-200 px-7 pt-6 pb-4 dark:border-gray-800">
				<div>
					<p className="text-[11.5px] font-semibold tracking-wider text-gray-500 uppercase dark:text-gray-400">
						Ajustes
					</p>
					<h1 className="mt-1 text-[22px] font-semibold text-gray-900 dark:text-gray-100">
						Plantillas
					</h1>
					<p className="mt-1 text-[12.5px] text-gray-500 dark:text-gray-400">
						{totals.total} plantillas activas · {totals.pdf} PDF · {totals.word} Word · {totals.deleted} en papelera
					</p>
				</div>
				<Button size="sm" className="gap-1.5" onClick={() => setOpenCreate(true)}>
					<Icon icon="ri:add-line" className="h-4 w-4" />
					Nueva plantilla
				</Button>
			</header>

			<TemplatesToolbar
				templates={templates}
				activeFilter={filter}
				onFilterChange={setFilter}
				search={search}
				onSearchChange={setSearch}
				visibleColumns={visibleColumns}
				onToggleColumn={toggleColumn}
			/>

			<TemplatesTable
				templates={paginated}
				visibleColumns={visibleColumns}
				sortKey={sort.key}
				sortDir={sort.dir}
				onSort={onSort}
				onRowClick={handleRowClick}
				onView={(t) => setOpenDetail(t)}
				onEdit={(t) => setOpenEdit(t)}
				onUpload={(t) => setOpenUpload(t)}
				onMap={(t) => setOpenMapping(t)}
				onDownload={handleDownload}
				onDuplicate={handleDuplicate}
				onCopyId={handleCopyId}
				onSoftDelete={(t) => setOpenConfirm({ template: t, mode: 'soft' })}
				onRestore={handleRestore}
				onHardDelete={(t) => setOpenConfirm({ template: t, mode: 'hard' })}
				selectionMode={selectionMode}
				onToggleAll={toggleAll}
				isSelected={isSelected}
				onToggleRow={toggleRow}
				emptyTitle={search || filter !== 'todas' ? 'Sin resultados' : 'No hay plantillas'}
				emptyDescription={
					search || filter !== 'todas'
						? 'Ajusta los filtros o la búsqueda para encontrar plantillas.'
						: 'Crea la primera plantilla para empezar a generar documentos.'
				}
				{...(!search && filter === 'todas'
					? {
							emptyAction: {
								label: 'Nueva plantilla',
								icon: 'ri:add-line',
								onClick: () => setOpenCreate(true),
							},
						}
					: {})}
			/>

			{sorted.length > 0 && (
				<TablePagination
					totalItems={sorted.length}
					page={page}
					pageSize={pageSize}
					onPageChange={setPage}
					onPageSizeChange={setPageSize}
				/>
			)}

			{/* Dialogs */}
			<CreateTemplateDialog
				open={openCreate}
				onOpenChange={setOpenCreate}
				onCreated={(t) => setTemplates((prev) => [t, ...prev])}
				transformers={transformers}
			/>

			<EditTemplateDialog
				template={openEdit}
				onOpenChange={(o) => {
					if (!o) setOpenEdit(null);
				}}
				onSaved={(updated) => {
					applyUpdate(updated);
					setOpenEdit(null);
				}}
				transformers={transformers}
			/>

			<UploadTemplateDialog
				template={openUpload}
				onOpenChange={(o) => {
					if (!o) setOpenUpload(null);
				}}
				onUploaded={(updated) => applyUpdate(updated)}
			/>

			{openMapping && (
				<TemplateMappingEditor
					template={openMapping}
					open={!!openMapping}
					onOpenChange={(o) => {
						if (!o) setOpenMapping(null);
					}}
					onSaved={(updated) => {
						applyUpdate(updated);
						setOpenMapping(null);
					}}
				/>
			)}

			<TemplateDetailSheet
				template={openDetail}
				onOpenChange={(o) => {
					if (!o) setOpenDetail(null);
				}}
				onEdit={(t) => setOpenEdit(t)}
				onMap={(t) => setOpenMapping(t)}
				onUpload={(t) => setOpenUpload(t)}
				onDownload={handleDownload}
				onArchive={(t) => setOpenConfirm({ template: t, mode: 'soft' })}
				onRestore={handleRestore}
				transformerMap={transformerMap}
			/>

			{/* Confirm delete dialog */}
			<Dialog
				open={!!openConfirm}
				onOpenChange={(o) => {
					if (!o) setOpenConfirm(null);
				}}
			>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>
							{openConfirm?.mode === 'hard' ? 'Eliminar definitivamente' : 'Enviar a papelera'}
						</DialogTitle>
						<DialogDescription>
							{openConfirm ? (
								openConfirm.mode === 'hard' ? (
									<>
										¿Eliminar permanentemente <strong>{openConfirm.template.name}</strong>? Esta
										acción no se puede deshacer y borrará también el archivo asociado.
									</>
								) : (
									<>
										¿Enviar <strong>{openConfirm.template.name}</strong> a la papelera? Podrás
										restaurarla más adelante.
									</>
								)
							) : null}
						</DialogDescription>
					</DialogHeader>
					<DialogFooter showCloseButton>
						<Button
							variant={openConfirm?.mode === 'hard' ? 'destructive' : 'secondary'}
							onClick={() => {
								if (!openConfirm) return;
								if (openConfirm.mode === 'hard') handleHardDelete(openConfirm.template.id);
								else handleSoftDelete(openConfirm.template.id);
							}}
						>
							<Icon
								icon={openConfirm?.mode === 'hard' ? 'ri:delete-bin-line' : 'ri:archive-line'}
								className="h-4 w-4"
							/>
							{openConfirm?.mode === 'hard' ? 'Eliminar definitivamente' : 'Enviar a papelera'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
