import * as React from 'react';
import type { ColumnDef, SortingState } from '@tanstack/react-table';
import {
	getCoreRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	useReactTable,
} from '@tanstack/react-table';
import { SearchIcon } from 'lucide-react';
import { Badge } from '@components/ui/Badge';
import { Button } from '@components/ui/Button';
import { Input } from '@components/ui/Input';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@components/ui/DropdownMenu';
import { Icon } from '@iconify/react';
import { cn } from '@components/utils';
import { toast } from 'sonner';
import type { DocumentDashboardRow } from '@domains/documents/document_dashboard';
import DocumentDetailDrawer from '@modules/companies/islands/DocumentDetailDrawer';
import {
	badgeForDocumentStatus,
	formatDate,
	getMimeBg,
	getMimeColor,
	getMimeIcon,
	statusLabel,
} from '../document-ui';

interface Props {
	documents: DocumentDashboardRow[];
	canUseStaffActions: boolean;
	/** Solo admin puede borrar de forma permanente (ver deleteDocument). */
	canDelete?: boolean;
	incorporationCaseId: string;
	companyUserId: string;
	isStaffDashboard: boolean;
}

export default function CompanyDocumentsList({
	documents,
	canUseStaffActions,
	canDelete = false,
	incorporationCaseId,
	companyUserId,
	isStaffDashboard,
}: Props) {
	const [docs, setDocs] = React.useState<DocumentDashboardRow[]>(
		() => documents,
	);
	const [selectedDocument, setSelectedDocument] =
		React.useState<DocumentDashboardRow | null>(null);
	const [sorting, setSorting] = React.useState<SortingState>([
		{ id: 'uploaded_at', desc: true },
	]);
	const [globalFilter, setGlobalFilter] = React.useState('');

	const onArchive = async (
		documentId: string,
		archived: boolean,
		e: React.MouseEvent,
	) => {
		e.stopPropagation();
		if (!canUseStaffActions) return;
		const toastId = toast.loading(archived ? 'Archivando…' : 'Desarchivando…');
		try {
			const res = await fetch('/api/documents/archive', {
				method: 'POST',
				credentials: 'include',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ documentId, archived }),
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data?.error || 'Error');

			setDocs((prev) =>
				prev.map((d) =>
					d.id === documentId ? { ...d, status: data.status } : d,
				),
			);
			toast.success(archived ? 'Documento archivado' : 'Documento restaurado', {
				id: toastId,
			});
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : 'No se pudo archivar',
				{ id: toastId },
			);
		}
	};

	const onDelete = async (
		documentId: string,
		fileName: string,
		e: React.MouseEvent,
	) => {
		e.stopPropagation();
		if (!canDelete) return;

		// Irreversible: se lleva el archivo y toda la bitácora del documento.
		const confirmed = globalThis.confirm(
			`Se eliminará «${fileName}» de forma permanente, junto con su archivo y todo su historial. Esta acción no se puede deshacer.\n\n¿Continuar?`,
		);
		if (!confirmed) return;

		const toastId = toast.loading('Eliminando…');
		try {
			const res = await fetch('/api/documents/delete', {
				method: 'POST',
				credentials: 'include',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ documentId }),
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data?.error || 'Error');

			setDocs((prev) => prev.filter((d) => d.id !== documentId));
			setSelectedDocument((prev) => (prev?.id === documentId ? null : prev));
			toast.success('Documento eliminado', { id: toastId });
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : 'No se pudo eliminar',
				{ id: toastId },
			);
		}
	};

	const onDownload = async (documentId: string, e: React.MouseEvent) => {
		e.stopPropagation();
		try {
			const res = await fetch('/api/documents/signed-url', {
				method: 'POST',
				credentials: 'include',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ documentId }),
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data?.error || 'Error');
			const a = document.createElement('a');
			a.href = data.signedUrl;
			a.download = '';
			a.style.display = 'none';
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
		} catch (err) {
			console.error('[download] signed-url failed', err);
			toast.error('No se pudo descargar el documento');
		}
	};

	const onShare = async (
		documentId: string,
		sharedWithUserId: string,
		e: React.MouseEvent,
	) => {
		e.stopPropagation();
		const toastId = toast.loading('Compartiendo documento…');
		try {
			const res = await fetch('/api/documents/share', {
				method: 'POST',
				credentials: 'include',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ documentId, sharedWithUserId }),
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data?.error || 'Error');
			setDocs((prev) =>
				prev.map((d) => {
					if (d.id !== documentId) return d;
					const existing = d.shares.find(
						(s) => s.shared_with_user_id === sharedWithUserId,
					);
					const newShares = existing
						? d.shares.map((s) =>
								s.shared_with_user_id === sharedWithUserId
									? {
											...s,
											share_status: 'active',
											shared_at: new Date().toISOString(),
										}
									: s,
							)
						: [
								...d.shares,
								{
									id: data.shareId ?? crypto.randomUUID(),
									shared_with_user_id: sharedWithUserId,
									share_status: 'active',
									shared_at: new Date().toISOString(),
								},
							];
					return { ...d, shares: newShares };
				}),
			);
			toast.success('Documento compartido con el cliente', { id: toastId });
		} catch {
			toast.error('No se pudo compartir el documento', { id: toastId });
		}
	};

	const onRevoke = async (
		documentId: string,
		sharedWithUserId: string,
		e: React.MouseEvent,
	) => {
		e.stopPropagation();
		const toastId = toast.loading('Revocando acceso…');
		try {
			const res = await fetch('/api/documents/revoke-share', {
				method: 'POST',
				credentials: 'include',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ documentId, sharedWithUserId }),
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data?.error || 'Error');
			setDocs((prev) =>
				prev.map((d) => {
					if (d.id !== documentId) return d;
					const newShares = d.shares.map((s) =>
						s.shared_with_user_id === sharedWithUserId
							? { ...s, share_status: 'revoked' }
							: s,
					);
					return { ...d, shares: newShares };
				}),
			);
			toast.success('Acceso revocado', { id: toastId });
		} catch {
			toast.error('No se pudo revocar el acceso', { id: toastId });
		}
	};

	const columns = React.useMemo<ColumnDef<DocumentDashboardRow>[]>(
		() => [
			{
				id: 'document',
				accessorFn: (row) => row.file_title ?? row.file_name,
				header: 'Documento',
				cell: ({ row }) => {
					const doc = row.original;
					const name = doc.file_title ?? doc.file_name;
					const typeName = doc.document_type?.name;
					return (
						<div className="flex items-center gap-3">
							<div
								className={cn(
									'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
									getMimeBg(doc.mime_type),
								)}
							>
								<Icon
									icon={getMimeIcon(doc.mime_type)}
									className={cn('h-4.5 w-4.5', getMimeColor(doc.mime_type))}
								/>
							</div>
							<div className="min-w-0">
								<p className="text-foreground truncate text-sm font-medium">
									{name}
								</p>
								{typeName && (
									<p className="text-muted-foreground truncate text-xs">
										{typeName}
									</p>
								)}
							</div>
						</div>
					);
				},
			},
			{
				accessorKey: 'status',
				header: 'Estado',
				cell: ({ row }) => (
					<Badge variant={badgeForDocumentStatus(row.original.status)}>
						{statusLabel(row.original.status)}
					</Badge>
				),
			},
			{
				accessorKey: 'uploaded_at',
				header: 'Fecha',
				cell: ({ row }) => (
					<span className="text-muted-foreground text-sm">
						{formatDate(row.original.uploaded_at)}
					</span>
				),
			},
			{
				id: 'actions',
				header: '',
				enableSorting: false,
				cell: ({ row }) => {
					const doc = row.original;
					const hasActiveShare = doc.shares.some(
						(s) =>
							s.shared_with_user_id === companyUserId &&
							s.share_status === 'active',
					);
					return (
						<DropdownMenu>
							<DropdownMenuTrigger
								onClick={(e) => e.stopPropagation()}
								render={
									<Button
										type="button"
										variant="ghost"
										size="icon"
										className="h-8 w-8"
									>
										<Icon icon="ri:more-2-line" className="h-4 w-4" />
									</Button>
								}
							/>
							<DropdownMenuContent align="end" className="w-44">
								<DropdownMenuItem
									onClick={(e) => onDownload(doc.id, e)}
									className="gap-2"
								>
									<Icon icon="ri:download-2-line" className="h-4 w-4" />
									Descargar
								</DropdownMenuItem>
								{canUseStaffActions &&
									(hasActiveShare ? (
										<DropdownMenuItem
											onClick={(e) => onRevoke(doc.id, companyUserId, e)}
											className="gap-2 text-red-600 dark:text-red-400"
										>
											<Icon icon="ri:forbid-line" className="h-4 w-4" />
											Revocar acceso
										</DropdownMenuItem>
									) : (
										<DropdownMenuItem
											onClick={(e) => onShare(doc.id, companyUserId, e)}
											className="gap-2 text-emerald-700 dark:text-emerald-400"
										>
											<Icon icon="ri:share-forward-line" className="h-4 w-4" />
											Compartir
										</DropdownMenuItem>
									))}
								{canUseStaffActions && (
									<DropdownMenuItem
										onClick={(e) =>
											onArchive(doc.id, doc.status !== 'archived', e)
										}
										className="gap-2"
									>
										<Icon
											icon={
												doc.status === 'archived'
													? 'ri:inbox-unarchive-line'
													: 'ri:inbox-archive-line'
											}
											className="h-4 w-4"
										/>
										{doc.status === 'archived' ? 'Desarchivar' : 'Archivar'}
									</DropdownMenuItem>
								)}
								{canDelete && (
									<DropdownMenuItem
										onClick={(e) =>
											onDelete(doc.id, doc.file_title ?? doc.file_name, e)
										}
										className="gap-2 text-red-600 dark:text-red-400"
									>
										<Icon icon="ri:delete-bin-line" className="h-4 w-4" />
										Eliminar
									</DropdownMenuItem>
								)}
							</DropdownMenuContent>
						</DropdownMenu>
					);
				},
			},
		],
		[canUseStaffActions, canDelete, companyUserId],
	);

	const [isTransitioning, setIsTransitioning] = React.useState(false);

	/**
	 * Vista de archivados. Se separa en lugar de mezclarse con los activos:
	 * archivar sirve para sacar un documento de en medio, así que volver a
	 * verlo debe ser un gesto deliberado. Es también el único sitio desde el
	 * que se puede restaurar o eliminar definitivamente.
	 */
	const [showArchived, setShowArchived] = React.useState(false);

	const archivedCount = React.useMemo(
		() => docs.filter((d) => d.status === 'archived').length,
		[docs],
	);

	const visibleDocs = React.useMemo(
		() =>
			docs.filter((d) =>
				showArchived ? d.status === 'archived' : d.status !== 'archived',
			),
		[docs, showArchived],
	);

	const table = useReactTable({
		data: visibleDocs,
		columns,
		initialState: { pagination: { pageSize: 5 } },
		onSortingChange: setSorting,
		onGlobalFilterChange: setGlobalFilter,
		globalFilterFn: (row, _columnId, filterValue: string) => {
			const q = filterValue.trim().toLowerCase();
			if (!q) return true;
			const doc = row.original;
			const haystack = [
				doc.file_title ?? doc.file_name,
				doc.document_type?.name ?? '',
				statusLabel(doc.status),
			]
				.join(' ')
				.toLowerCase();
			return haystack.includes(q);
		},
		getCoreRowModel: getCoreRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		state: { sorting, globalFilter },
	});

	const changePage = (direction: 'prev' | 'next') => {
		setIsTransitioning(true);
		setTimeout(() => {
			if (direction === 'next') table.nextPage();
			else table.previousPage();
			setIsTransitioning(false);
		}, 150);
	};

	return (
		<>
			<div className="space-y-3">
				<div className="flex flex-col gap-2 sm:flex-row sm:items-center">
					<div className="relative w-full">
						<SearchIcon
							size={16}
							className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"
						/>
						<Input
							placeholder="Buscar por nombre, tipo o estado..."
							value={globalFilter}
							onChange={(event) => setGlobalFilter(event.target.value)}
							className="pl-9"
						/>
					</div>

					{canUseStaffActions && (
						<Button
							type="button"
							variant={showArchived ? 'default' : 'outline'}
							size="sm"
							onClick={() => setShowArchived((v) => !v)}
							className="shrink-0 gap-2"
						>
							<Icon icon="ri:archive-line" className="h-4 w-4" />
							{showArchived
								? 'Ver activos'
								: `Archivados${archivedCount > 0 ? ` (${archivedCount})` : ''}`}
						</Button>
					)}
				</div>

				{table.getRowModel().rows.length === 0 ? (
					<div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-gray-200 py-10 text-center dark:border-gray-700">
						<Icon
							icon="ri:file-text-line"
							className="text-muted-foreground h-8 w-8"
						/>
						<p className="text-muted-foreground text-sm">
							{globalFilter
								? 'No se encontraron documentos con ese criterio.'
								: showArchived
									? 'No hay documentos archivados.'
									: 'Aún no hay documentos para esta empresa.'}
						</p>
					</div>
				) : (
					<ul
						className={cn(
							'divide-border divide-y transition-opacity duration-200 ease-in-out',
							isTransitioning ? 'opacity-0' : 'opacity-100',
						)}
					>
						{table.getRowModel().rows.map((row) => {
							const doc = row.original;
							const name = doc.file_title ?? doc.file_name;
							const typeName = doc.document_type?.name;
							const hasActiveShare = doc.shares.some(
								(s) =>
									s.shared_with_user_id === companyUserId &&
									s.share_status === 'active',
							);

							return (
								<li
									key={row.id}
									onClick={() => setSelectedDocument(doc)}
									className="hover:bg-muted/40 flex cursor-pointer items-center gap-4 py-3 transition-colors"
								>
									{/* Icon */}
									<div
										className={cn(
											'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
											getMimeBg(doc.mime_type),
										)}
									>
										<Icon
											icon={getMimeIcon(doc.mime_type)}
											className={cn('h-5 w-5', getMimeColor(doc.mime_type))}
										/>
									</div>

									{/* Name + type */}
									<div className="min-w-0 flex-1">
										<p className="text-foreground truncate text-sm font-medium">
											{name}
										</p>
										<div className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-2 text-xs">
											{typeName && <span>{typeName}</span>}
											{typeName && <span className="text-border">·</span>}
											<span>{formatDate(doc.uploaded_at)}</span>
										</div>
									</div>

									{/* Status badge */}
									<Badge
										variant={badgeForDocumentStatus(doc.status)}
										className="shrink-0"
									>
										{statusLabel(doc.status)}
									</Badge>

									{/* Actions */}
									<div className="flex shrink-0 items-center gap-1">
										<button
											type="button"
											onClick={(e) => onDownload(doc.id, e)}
											className="text-muted-foreground hover:bg-muted hover:text-foreground inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors"
											title="Descargar"
										>
											<Icon icon="ri:download-2-line" className="h-4 w-4" />
										</button>
										{(canUseStaffActions || canDelete) && (
											<DropdownMenu>
												<DropdownMenuTrigger
													onClick={(e) => e.stopPropagation()}
													render={
														<button
															type="button"
															className="text-muted-foreground hover:bg-muted hover:text-foreground inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors"
														>
															<Icon icon="ri:more-2-line" className="h-4 w-4" />
														</button>
													}
												/>
												<DropdownMenuContent align="end" className="w-44">
													{hasActiveShare ? (
														<DropdownMenuItem
															onClick={(e) =>
																onRevoke(doc.id, companyUserId, e)
															}
															className="gap-2 text-red-600 dark:text-red-400"
														>
															<Icon icon="ri:forbid-line" className="h-4 w-4" />
															Revocar acceso
														</DropdownMenuItem>
													) : (
														<DropdownMenuItem
															onClick={(e) => onShare(doc.id, companyUserId, e)}
															className="gap-2 text-emerald-700 dark:text-emerald-400"
														>
															<Icon
																icon="ri:share-forward-line"
																className="h-4 w-4"
															/>
															Compartir
														</DropdownMenuItem>
													)}
													{canUseStaffActions && (
														<DropdownMenuItem
															onClick={(e) =>
																onArchive(doc.id, doc.status !== 'archived', e)
															}
															className="gap-2"
														>
															<Icon
																icon={
																	doc.status === 'archived'
																		? 'ri:inbox-unarchive-line'
																		: 'ri:inbox-archive-line'
																}
																className="h-4 w-4"
															/>
															{doc.status === 'archived'
																? 'Desarchivar'
																: 'Archivar'}
														</DropdownMenuItem>
													)}
													{canDelete && (
														<DropdownMenuItem
															onClick={(e) =>
																onDelete(
																	doc.id,
																	doc.file_title ?? doc.file_name,
																	e,
																)
															}
															className="gap-2 text-red-600 dark:text-red-400"
														>
															<Icon
																icon="ri:delete-bin-line"
																className="h-4 w-4"
															/>
															Eliminar
														</DropdownMenuItem>
													)}
												</DropdownMenuContent>
											</DropdownMenu>
										)}
									</div>
								</li>
							);
						})}
					</ul>
				)}

				{/* Pagination */}
				{(table.getCanPreviousPage() || table.getCanNextPage()) && (
					<div className="border-border flex items-center justify-between border-t pt-3">
						<p className="text-muted-foreground text-xs">
							Página {table.getState().pagination.pageIndex + 1} de{' '}
							{table.getPageCount()} · {table.getFilteredRowModel().rows.length}{' '}
							documento
							{table.getFilteredRowModel().rows.length === 1 ? '' : 's'}
						</p>
						<div className="flex items-center gap-2">
							<Button
								variant="outline"
								size="sm"
								onClick={() => changePage('prev')}
								disabled={!table.getCanPreviousPage() || isTransitioning}
							>
								Anterior
							</Button>
							<Button
								variant="outline"
								size="sm"
								onClick={() => changePage('next')}
								disabled={!table.getCanNextPage() || isTransitioning}
							>
								Siguiente
							</Button>
						</div>
					</div>
				)}
			</div>

			<DocumentDetailDrawer
				document={selectedDocument}
				open={selectedDocument !== null}
				onClose={() => setSelectedDocument(null)}
				isStaff={canUseStaffActions}
				incorporationCaseId={incorporationCaseId}
				sharedWithUserId={isStaffDashboard ? companyUserId : undefined}
				onDocumentUpdated={(updated) => {
					setDocs((prev) =>
						prev.map((d) => (d.id === updated.id ? updated : d)),
					);
					setSelectedDocument((prev) =>
						prev?.id === updated.id ? updated : prev,
					);
				}}
			/>
		</>
	);
}
