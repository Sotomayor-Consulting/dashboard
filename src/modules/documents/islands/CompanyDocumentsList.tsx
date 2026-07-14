import * as React from 'react';
import type { ColumnDef, SortingState } from '@tanstack/react-table';
import {
	flexRender,
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
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@components/ui/Table';
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
	incorporationCaseId: string;
	companyUserId: string;
	isStaffDashboard: boolean;
}

function SortableHeader({
	label,
	sorted,
	onClick,
}: {
	label: string;
	sorted: false | 'asc' | 'desc';
	onClick: (event: unknown) => void;
}) {
	const icon = !sorted
		? 'ri:arrow-up-down-line'
		: sorted === 'asc'
			? 'ri:arrow-up-s-line'
			: 'ri:arrow-down-s-line';
	return (
		<button
			type="button"
			onClick={onClick}
			className="flex items-center gap-1 select-none"
		>
			{label}
			<Icon icon={icon} className="h-3.5 w-3.5 text-gray-400" />
		</button>
	);
}

export default function CompanyDocumentsList({
	documents,
	canUseStaffActions,
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
				id: 'icon',
				header: '',
				enableSorting: false,
				cell: ({ row }) => (
					<div
						className={cn(
							'flex h-8 w-8 items-center justify-center rounded-lg',
							getMimeBg(row.original.mime_type),
						)}
					>
						<Icon
							icon={getMimeIcon(row.original.mime_type)}
							className={cn('h-4 w-4', getMimeColor(row.original.mime_type))}
						/>
					</div>
				),
			},
			{
				id: 'name',
				accessorFn: (row) => row.file_title ?? row.file_name,
				header: ({ column }) => (
					<SortableHeader
						label="Documento"
						sorted={column.getIsSorted()}
						onClick={column.getToggleSortingHandler()!}
					/>
				),
				cell: ({ getValue }) => (
					<span className="block max-w-56 truncate">{getValue<string>()}</span>
				),
			},
			{
				id: 'type',
				accessorFn: (row) => row.document_type?.name ?? 'Documento',
				header: ({ column }) => (
					<SortableHeader
						label="Tipo"
						sorted={column.getIsSorted()}
						onClick={column.getToggleSortingHandler()!}
					/>
				),
				cell: ({ getValue }) => (
					<span className="block max-w-36 truncate">{getValue<string>()}</span>
				),
			},
			{
				accessorKey: 'status',
				header: ({ column }) => (
					<SortableHeader
						label="Estado"
						sorted={column.getIsSorted()}
						onClick={column.getToggleSortingHandler()!}
					/>
				),
				cell: ({ row }) => (
					<Badge variant={badgeForDocumentStatus(row.original.status)}>
						{statusLabel(row.original.status)}
					</Badge>
				),
			},
			{
				accessorKey: 'uploaded_at',
				header: ({ column }) => (
					<SortableHeader
						label="Fecha"
						sorted={column.getIsSorted()}
						onClick={column.getToggleSortingHandler()!}
					/>
				),
				cell: ({ row }) => formatDate(row.original.uploaded_at),
			},
			{
				id: 'actions',
				header: () => <span>Acciones</span>,
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
							</DropdownMenuContent>
						</DropdownMenu>
					);
				},
			},
		],
		[canUseStaffActions, companyUserId],
	);

	const table = useReactTable({
		data: docs,
		columns,
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

	return (
		<>
			<div className="space-y-4">
				<div className="relative w-full max-w-sm">
					<SearchIcon
						size={16}
						className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"
					/>
					<Input
						placeholder="Buscar por nombre, tipo o estado..."
						value={globalFilter}
						onChange={(event) => setGlobalFilter(event.target.value)}
						className="max-w-sm pl-9"
					/>
				</div>

				<div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
					<Table>
						<TableHeader>
							{table.getHeaderGroups().map((headerGroup) => (
								<TableRow key={headerGroup.id}>
									{headerGroup.headers.map((header) => (
										<TableHead
											key={header.id}
											className={header.column.id === 'icon' ? 'w-10 pr-0' : ''}
										>
											{header.isPlaceholder
												? null
												: flexRender(
														header.column.columnDef.header,
														header.getContext(),
													)}
										</TableHead>
									))}
								</TableRow>
							))}
						</TableHeader>
						<TableBody>
							{table.getRowModel().rows.length ? (
								table.getRowModel().rows.map((row) => (
									<TableRow
										key={row.id}
										onClick={() => setSelectedDocument(row.original)}
										className="cursor-pointer"
									>
										{row.getVisibleCells().map((cell) => (
											<TableCell
												key={cell.id}
												className={cell.column.id === 'icon' ? 'w-10 pr-0' : ''}
											>
												{flexRender(
													cell.column.columnDef.cell,
													cell.getContext(),
												)}
											</TableCell>
										))}
									</TableRow>
								))
							) : (
								<TableRow>
									<TableCell
										colSpan={columns.length}
										className="h-16 text-center text-sm text-gray-500 dark:text-gray-300"
									>
										Aún no hay documentos para esta empresa.
									</TableCell>
								</TableRow>
							)}
						</TableBody>
					</Table>
				</div>

				<div className="flex items-center justify-end gap-2">
					<Button
						variant="outline"
						size="sm"
						onClick={() => table.previousPage()}
						disabled={!table.getCanPreviousPage()}
					>
						Anterior
					</Button>
					<Button
						variant="outline"
						size="sm"
						onClick={() => table.nextPage()}
						disabled={!table.getCanNextPage()}
					>
						Siguiente
					</Button>
				</div>
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
