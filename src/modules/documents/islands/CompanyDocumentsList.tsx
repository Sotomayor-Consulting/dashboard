import * as React from 'react';
import { Badge } from '@components/ui/Badge';
import { Button } from '@components/ui/Button';
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

type SortField = 'name' | 'type' | 'status' | 'date';

interface Props {
	documents: DocumentDashboardRow[];
	canUseStaffActions: boolean;
	incorporationCaseId: string;
	companyUserId: string;
	isStaffDashboard: boolean;
}

function getMimeIcon(mime: string | null): string {
	if (!mime) return 'ri:file-3-line';
	if (mime === 'application/pdf') return 'ri:file-pdf-2-line';
	if (mime.includes('word') || mime.includes('document'))
		return 'ri:file-word-2-line';
	if (mime.includes('excel') || mime.includes('spreadsheet'))
		return 'ri:file-excel-2-line';
	if (mime.includes('powerpoint') || mime.includes('presentation'))
		return 'ri:file-ppt-2-line';
	if (mime.startsWith('image/')) return 'ri:image-2-line';
	if (mime.startsWith('text/')) return 'ri:file-text-line';
	if (mime.includes('zip') || mime.includes('compressed'))
		return 'ri:file-zip-line';
	return 'ri:file-3-line';
}

function getMimeBg(mime: string | null): string {
	if (!mime) return 'bg-gray-100 dark:bg-gray-800';
	if (mime === 'application/pdf') return 'bg-red-100 dark:bg-red-950/40';
	if (mime.includes('word') || mime.includes('document'))
		return 'bg-blue-100 dark:bg-blue-950/40';
	if (mime.includes('excel') || mime.includes('spreadsheet'))
		return 'bg-emerald-100 dark:bg-emerald-950/40';
	if (mime.includes('powerpoint') || mime.includes('presentation'))
		return 'bg-orange-100 dark:bg-orange-950/40';
	if (mime.startsWith('image/')) return 'bg-purple-100 dark:bg-purple-950/40';
	return 'bg-gray-100 dark:bg-gray-800';
}

function getMimeColor(mime: string | null): string {
	if (!mime) return 'text-gray-500 dark:text-gray-400';
	if (mime === 'application/pdf') return 'text-red-600 dark:text-red-400';
	if (mime.includes('word') || mime.includes('document'))
		return 'text-blue-600 dark:text-blue-400';
	if (mime.includes('excel') || mime.includes('spreadsheet'))
		return 'text-emerald-600 dark:text-emerald-400';
	if (mime.includes('powerpoint') || mime.includes('presentation'))
		return 'text-orange-600 dark:text-orange-400';
	if (mime.startsWith('image/')) return 'text-purple-600 dark:text-purple-400';
	return 'text-gray-500 dark:text-gray-400';
}

function badgeForDocumentStatus(status: string) {
	if (status === 'approved') return 'susess';
	if (status === 'under_review' || status === 'uploaded') return 'standar';
	if (status === 'rejected' || status === 'expired') return 'danger';
	return 'warning';
}

function statusLabel(status: string): string {
	const map: Record<string, string> = {
		pending: 'Pendiente',
		uploaded: 'Subido',
		under_review: 'En revisión',
		approved: 'Aprobado',
		rejected: 'Rechazado',
		replaced: 'Reemplazado',
		expired: 'Vencido',
		archived: 'Archivado',
	};
	return map[status] ?? status;
}

function formatDate(value?: string | null) {
	if (!value) return '—';
	const d = new Date(value);
	if (Number.isNaN(d.getTime())) return value;
	return d.toLocaleDateString('es-ES');
}

function SortHead({
	field,
	activeField,
	dir,
	onSort,
	children,
}: {
	field: SortField;
	activeField: SortField;
	dir: 'asc' | 'desc';
	onSort: (f: SortField) => void;
	children: React.ReactNode;
}) {
	const active = activeField === field;
	const icon = active
		? dir === 'asc'
			? 'ri:arrow-up-s-line'
			: 'ri:arrow-down-s-line'
		: 'ri:arrow-up-down-line';
	return (
		<TableHead
			onClick={() => onSort(field)}
			className="cursor-pointer select-none"
		>
			<span className="flex items-center gap-1">
				{children}
				<Icon icon={icon} className="h-3.5 w-3.5 text-gray-400" />
			</span>
		</TableHead>
	);
}

export default function CompanyDocumentsList({
	documents,
	canUseStaffActions,
	incorporationCaseId,
	companyUserId,
	isStaffDashboard,
}: Props) {
	const [docs, setDocs] = React.useState<DocumentDashboardRow[]>(() => documents);
	const [selectedDocument, setSelectedDocument] =
		React.useState<DocumentDashboardRow | null>(null);
	const [sortField, setSortField] = React.useState<SortField>('date');
	const [sortDir, setSortDir] = React.useState<'asc' | 'desc'>('desc');

	const handleSort = (field: SortField) => {
		if (sortField === field) {
			setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
		} else {
			setSortField(field);
			setSortDir('asc');
		}
	};

	const sortedDocs = React.useMemo(() => {
		return [...documents].sort((a, b) => {
			let va = '';
			let vb = '';
			if (sortField === 'name') {
				va = a.file_title ?? a.file_name;
				vb = b.file_title ?? b.file_name;
			} else if (sortField === 'type') {
				va = a.document_type?.name ?? '';
				vb = b.document_type?.name ?? '';
			} else if (sortField === 'status') {
				va = a.status;
				vb = b.status;
			} else {
				va = a.uploaded_at ?? '';
				vb = b.uploaded_at ?? '';
			}
			return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
		});
	}, [docs, sortField, sortDir]);

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
			window.open(data.signedUrl, '_blank');
		} catch {
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
									? { ...s, share_status: 'active', shared_at: new Date().toISOString() }
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

	if (documents.length === 0) {
		return (
			<div className="rounded-lg border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-300">
				Aún no hay documentos para esta empresa.
			</div>
		);
	}

	return (
		<>
			<div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead className="w-10 pr-0" />
							<SortHead
								field="name"
								activeField={sortField}
								dir={sortDir}
								onSort={handleSort}
							>
								Documento
							</SortHead>
							<SortHead
								field="type"
								activeField={sortField}
								dir={sortDir}
								onSort={handleSort}
							>
								Tipo
							</SortHead>
							<SortHead
								field="status"
								activeField={sortField}
								dir={sortDir}
								onSort={handleSort}
							>
								Estado
							</SortHead>
							<SortHead
								field="date"
								activeField={sortField}
								dir={sortDir}
								onSort={handleSort}
							>
								Fecha
							</SortHead>
							<TableHead>Acciones</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{sortedDocs.map((doc) => {
							const hasActiveShare = doc.shares.some(
								(s) =>
									s.shared_with_user_id === companyUserId &&
									s.share_status === 'active',
							);
							return (
								<TableRow
									key={doc.id}
									onClick={() => setSelectedDocument(doc)}
									className="cursor-pointer"
								>
									<TableCell className="w-10 pr-0">
										<div
											className={cn(
												'flex h-8 w-8 items-center justify-center rounded-lg',
												getMimeBg(doc.mime_type),
											)}
										>
											<Icon
												icon={getMimeIcon(doc.mime_type)}
												className={cn('h-4 w-4', getMimeColor(doc.mime_type))}
											/>
										</div>
									</TableCell>
									<TableCell className="max-w-56 truncate">
										{doc.file_title ?? doc.file_name}
									</TableCell>
									<TableCell className="max-w-36 truncate">
										{doc.document_type?.name ?? 'Documento'}
									</TableCell>
									<TableCell>
										<Badge variant={badgeForDocumentStatus(doc.status)}>
											{statusLabel(doc.status)}
										</Badge>
									</TableCell>
									<TableCell>{formatDate(doc.uploaded_at)}</TableCell>
									<TableCell>
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
													<Icon
														icon="ri:download-2-line"
														className="h-4 w-4"
													/>
													Descargar
												</DropdownMenuItem>
												{canUseStaffActions && (
													<>
														{hasActiveShare ? (
															<DropdownMenuItem
																onClick={(e) =>
																	onRevoke(doc.id, companyUserId, e)
																}
																className="gap-2 text-red-600 dark:text-red-400"
															>
																<Icon
																	icon="ri:forbid-line"
																	className="h-4 w-4"
																/>
																Revocar acceso
															</DropdownMenuItem>
														) : (
															<DropdownMenuItem
																onClick={(e) =>
																	onShare(doc.id, companyUserId, e)
																}
																className="gap-2 text-emerald-700 dark:text-emerald-400"
															>
																<Icon
																	icon="ri:share-forward-line"
																	className="h-4 w-4"
																/>
																Compartir
															</DropdownMenuItem>
														)}
													</>
												)}
											</DropdownMenuContent>
										</DropdownMenu>
									</TableCell>
								</TableRow>
							);
						})}
					</TableBody>
				</Table>
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
