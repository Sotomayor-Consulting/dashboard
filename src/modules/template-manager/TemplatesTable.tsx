import { Icon } from '@iconify/react';

import { SelectionCheckbox } from '@components/ui/SelectionCheckbox';
import { cn } from '@components/utils';

import type { TemplateWithDocument } from '@domains/templates/types';
import { getEntityLabel, type EntityType } from '@domains/templates/entity-registry';

import { EmptyState } from './cells/EmptyState';
import { TemplateNameCell } from './cells/TemplateNameCell';
import { TemplateRowActions } from './cells/TemplateRowActions';
import { TemplateStatusBadge } from './cells/TemplateStatusBadge';
import { TemplateTypeBadge } from './cells/TemplateTypeBadge';
import type { ColumnId } from './TemplatesToolbar';

export type TemplatesSortKey = 'name' | 'type' | 'category' | 'entity' | 'status' | 'created';
export type TemplatesSortDir = 'asc' | 'desc';

interface Props {
	templates: TemplateWithDocument[];
	visibleColumns: Record<ColumnId, boolean>;
	sortKey: TemplatesSortKey;
	sortDir: TemplatesSortDir;
	onSort: (key: TemplatesSortKey) => void;
	onRowClick: (t: TemplateWithDocument) => void;
	onView: (t: TemplateWithDocument) => void;
	onEdit: (t: TemplateWithDocument) => void;
	onUpload: (t: TemplateWithDocument) => void;
	onMap: (t: TemplateWithDocument) => void;
	onDownload: (t: TemplateWithDocument) => void;
	onDuplicate: (t: TemplateWithDocument) => void;
	onCopyId: (t: TemplateWithDocument) => void;
	onSoftDelete: (t: TemplateWithDocument) => void;
	onRestore: (t: TemplateWithDocument) => void;
	onHardDelete: (t: TemplateWithDocument) => void;
	// Selección
	selectionMode: 'none' | 'some' | 'all';
	onToggleAll: () => void;
	isSelected: (id: string) => boolean;
	onToggleRow: (id: string) => void;
	emptyAction?: { label: string; icon?: string; onClick: () => void };
	emptyTitle?: string;
	emptyDescription?: string;
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

function SortableTh({
	label,
	keyId,
	active,
	dir,
	onClick,
	className,
}: {
	label: string;
	keyId: TemplatesSortKey;
	active: boolean;
	dir: TemplatesSortDir;
	onClick: (k: TemplatesSortKey) => void;
	className?: string;
}) {
	return (
		<th className={className}>
			<button
				type="button"
				onClick={() => onClick(keyId)}
				className="inline-flex items-center gap-1 tracking-wider uppercase hover:text-gray-900 dark:hover:text-gray-100"
			>
				{label}
				{active && (
					<Icon
						icon={dir === 'asc' ? 'ri:arrow-up-s-line' : 'ri:arrow-down-s-line'}
						className="h-3.5 w-3.5"
					/>
				)}
			</button>
		</th>
	);
}

export function TemplatesTable({
	templates,
	visibleColumns,
	sortKey,
	sortDir,
	onSort,
	onRowClick,
	onView,
	onEdit,
	onUpload,
	onMap,
	onDownload,
	onDuplicate,
	onCopyId,
	onSoftDelete,
	onRestore,
	onHardDelete,
	selectionMode,
	onToggleAll,
	isSelected,
	onToggleRow,
	emptyAction,
	emptyTitle = 'Sin resultados',
	emptyDescription = 'Ajusta los filtros o la búsqueda para encontrar plantillas.',
}: Props) {
	if (templates.length === 0) {
		return (
			<EmptyState
				icon="ri:file-list-3-line"
				title={emptyTitle}
				description={emptyDescription}
				{...(emptyAction ? { action: emptyAction } : {})}
			/>
		);
	}

	return (
		<div className="w-full overflow-x-auto">
			<table className="w-full text-sm">
				<thead className="border-b border-gray-200 text-[10.5px] font-medium tracking-wider text-gray-500 uppercase dark:border-gray-800 dark:text-gray-400">
					<tr>
						<th className="w-10 px-7 py-3 text-left">
							<SelectionCheckbox
								mode="header"
								selectionMode={selectionMode}
								onToggle={onToggleAll}
							/>
						</th>
						<SortableTh
							label="Plantilla"
							keyId="name"
							active={sortKey === 'name'}
							dir={sortDir}
							onClick={onSort}
							className="py-3 pr-4 text-left"
						/>
						<SortableTh
							label="Tipo"
							keyId="type"
							active={sortKey === 'type'}
							dir={sortDir}
							onClick={onSort}
							className="py-3 pr-4 text-left"
						/>
						{visibleColumns.category && (
							<SortableTh
								label="Categoría"
								keyId="category"
								active={sortKey === 'category'}
								dir={sortDir}
								onClick={onSort}
								className="py-3 pr-4 text-left"
							/>
						)}
						{visibleColumns.entity && (
							<SortableTh
								label="Entidad"
								keyId="entity"
								active={sortKey === 'entity'}
								dir={sortDir}
								onClick={onSort}
								className="py-3 pr-4 text-left"
							/>
						)}
						{visibleColumns.file && (
							<th className="py-3 pr-4 text-left">
								<span className="tracking-wider uppercase">Archivo</span>
							</th>
						)}
						{visibleColumns.status && (
							<SortableTh
								label="Estado"
								keyId="status"
								active={sortKey === 'status'}
								dir={sortDir}
								onClick={onSort}
								className="py-3 pr-4 text-left"
							/>
						)}
						{visibleColumns.actions && (
							<th className="w-12 py-3 pr-7 text-right">
								<span className="sr-only">Acciones</span>
							</th>
						)}
					</tr>
				</thead>
				<tbody>
					{templates.map((t) => {
						const isDeleted = !!t.deleted_at;
						const rowSelected = isSelected(t.id);
						return (
							<tr
								key={t.id}
								onClick={() => onRowClick(t)}
								className={cn(
									'h-[52px] cursor-pointer border-b border-gray-100 transition-colors dark:border-gray-800/60',
									rowSelected
										? 'bg-gray-100 dark:bg-neutral-900'
										: 'hover:bg-gray-50 dark:hover:bg-neutral-900/60',
									isDeleted && 'opacity-60',
								)}
							>
								<td className="px-7" onClick={(e) => e.stopPropagation()}>
									<SelectionCheckbox
										mode="row"
										checked={rowSelected}
										onToggle={() => onToggleRow(t.id)}
									/>
								</td>
								<td className="pr-4">
									<TemplateNameCell template={t} />
								</td>
								<td className="pr-4">
									<TemplateTypeBadge type={t.template_type} />
								</td>
								{visibleColumns.category && (
									<td className="pr-4">
										{t.category ? (
											<span className="text-[12.5px] text-gray-700 capitalize dark:text-gray-300">
												{t.category}
											</span>
										) : (
											<span className="text-[11.5px] text-gray-400">—</span>
										)}
									</td>
								)}
								{visibleColumns.entity && (
									<td className="pr-4">
										{t.related_to_type ? (
											<span className="text-[12.5px] text-gray-700 dark:text-gray-300">
												{getEntityLabel(t.related_to_type as EntityType)}
											</span>
										) : (
											<span className="text-[11.5px] text-gray-400">—</span>
										)}
									</td>
								)}
								{visibleColumns.file && (
									<td className="pr-4">
										{t.document ? (
											<span
												className="inline-flex items-center gap-1.5 text-[12.5px] text-gray-700 dark:text-gray-300"
												title={t.document.file_name}
											>
												<Icon icon="ri:attachment-2" className="h-3.5 w-3.5 text-gray-400" />
												<span className="tabular-nums">{fmtBytes(t.document.file_size_bytes)}</span>
											</span>
										) : t.source_url ? (
											<span className="inline-flex items-center gap-1.5 text-[12.5px] text-blue-600 dark:text-blue-400">
												<Icon icon="ri:link" className="h-3.5 w-3.5" />
												URL externa
											</span>
										) : (
											<span className="text-[11.5px] text-gray-400">—</span>
										)}
									</td>
								)}
								{visibleColumns.status && (
									<td className="pr-4">
										<TemplateStatusBadge template={t} />
									</td>
								)}
								{visibleColumns.actions && (
									<td className="pr-7 text-right" onClick={(e) => e.stopPropagation()}>
										<TemplateRowActions
											template={t}
											onView={onView}
											onEdit={onEdit}
											onUpload={onUpload}
											onMap={onMap}
											onDownload={onDownload}
											onDuplicate={onDuplicate}
											onCopyId={onCopyId}
											onSoftDelete={onSoftDelete}
											onRestore={onRestore}
											onHardDelete={onHardDelete}
										/>
									</td>
								)}
							</tr>
						);
					})}
				</tbody>
			</table>
		</div>
	);
}
