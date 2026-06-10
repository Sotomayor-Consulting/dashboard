import * as React from 'react';
import { Badge } from '@components/ui/Badge';
import { Button } from '@components/ui/Button';
import {
	Sheet,
	SheetContent,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from '@components/ui/Sheet';
import { ScrollArea, ScrollBar } from '@components/ui/ScrollArea';
import { Skeleton } from '@components/ui/Skeleton';
import { cn } from '@components/utils';
import { Icon } from '@iconify/react';
import { toast } from 'sonner';
import type { DocumentDashboardRow } from '@domains/documents/document_dashboard';

interface Props {
	document: DocumentDashboardRow | null;
	open: boolean;
	onClose: () => void;
	isStaff: boolean;
	incorporationCaseId: string;
	sharedWithUserId?: string | undefined;
	onDocumentUpdated?: (doc: DocumentDashboardRow) => void;
}

interface DocumentEvent {
	id: string;
	event_type: string;
	actor_user_id: string;
	actor_role: string;
	actor_name: string | null;
	notes: string | null;
	created_at: string;
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
	if (mime.startsWith('text/')) return 'bg-gray-100 dark:bg-gray-800';
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
	if (mime.startsWith('text/')) return 'text-gray-600 dark:text-gray-400';
	return 'text-gray-500 dark:text-gray-400';
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

function badgeVariant(
	status: string,
): 'susess' | 'standar' | 'danger' | 'warning' {
	if (status === 'approved') return 'susess';
	if (status === 'under_review' || status === 'uploaded') return 'standar';
	if (status === 'rejected' || status === 'expired') return 'danger';
	return 'warning';
}

function eventTypeLabel(type: string): string {
	const map: Record<string, string> = {
		uploaded: 'Subido',
		metadata_updated: 'Metadatos actualizados',
		visibility_changed: 'Visibilidad cambiada',
		shared: 'Compartido',
		share_revoked: 'Acceso revocado',
		downloaded: 'Descargado',
		previewed: 'Visualizado',
		replaced: 'Reemplazado',
		approved: 'Aprobado',
		rejected: 'Rechazado',
		deleted: 'Eliminado',
		restored: 'Restaurado',
		access_denied: 'Acceso denegado',
	};
	return map[type] ?? type;
}

function eventTypeIcon(type: string): string {
	const map: Record<string, string> = {
		uploaded: 'ri:upload-2-line',
		metadata_updated: 'ri:edit-line',
		visibility_changed: 'ri:eye-line',
		shared: 'ri:share-forward-line',
		share_revoked: 'ri:forbid-line',
		downloaded: 'ri:download-2-line',
		previewed: 'ri:eye-line',
		replaced: 'ri:refresh-line',
		approved: 'ri:checkbox-circle-line',
		rejected: 'ri:close-circle-line',
		deleted: 'ri:delete-bin-line',
		restored: 'ri:restart-line',
		access_denied: 'ri:lock-line',
	};
	return map[type] ?? 'ri:information-line';
}

function actorRoleLabel(role: string): string {
	const map: Record<string, string> = {
		admin: 'Administrador',
		operaciones: 'Equipo de Operaciones',
		cliente: 'Cliente',
	};
	return map[role] ?? role;
}

function formatFileSize(bytes: number | null | undefined): string {
	if (!bytes) return '—';
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function legalCategoryLabel(cat: string | null | undefined): string {
	if (!cat) return '—';
	const map: Record<string, string> = {
		identity: 'Identidad',
		address: 'Domicilio',
		corporate: 'Corporativo',
		tax: 'Fiscal',
		compliance: 'Cumplimiento',
		authority: 'Autoridad',
		banking: 'Bancario',
		registry: 'Registro',
		supporting: 'Complementario',
	};
	return map[cat] ?? cat;
}

function visibilityLabel(vis: string | undefined): string {
	if (!vis) return '—';
	return vis === 'client_visible' ? 'Visible al cliente' : 'Solo interno';
}

// Timestamps from Supabase arrive as ISO 8601 UTC strings (timestamptz).
// Intl.DateTimeFormat without an explicit timeZone option uses the browser's
// system timezone automatically — the correct behavior for display.
const dateFormatter = new Intl.DateTimeFormat('es-ES', {
	day: '2-digit',
	month: '2-digit',
	year: 'numeric',
});

const dateTimeFormatter = new Intl.DateTimeFormat('es-ES', {
	day: '2-digit',
	month: '2-digit',
	year: 'numeric',
	hour: '2-digit',
	minute: '2-digit',
});

function formatDate(iso: string | null | undefined): string {
	if (!iso) return '—';
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return iso;
	return dateFormatter.format(d);
}

function formatDateTime(iso: string | null | undefined): string {
	if (!iso) return '—';
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return iso;
	return dateTimeFormatter.format(d);
}

function MiniStat({ label, value }: { label: string; value: React.ReactNode }) {
	return (
		<div className="rounded-md border border-gray-200 p-2.5 dark:border-gray-800">
			<p className="text-[9.5px] font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
				{label}
			</p>
			<p className="mt-1 truncate text-[13px] font-semibold text-gray-900 dark:text-gray-100">
				{value || '—'}
			</p>
		</div>
	);
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
	return (
		<div className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-2.5 dark:border-gray-800">
			<span className="text-[11.5px] text-gray-500 dark:text-gray-400">
				{label}
			</span>
			<span className="text-right text-[11.5px] font-medium text-gray-900 dark:text-gray-100">
				{value || '—'}
			</span>
		</div>
	);
}

async function fetchSignedUrl(documentId: string): Promise<string> {
	const res = await fetch('/api/documents/signed-url', {
		method: 'POST',
		credentials: 'include',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ documentId }),
	});
	const data = await res.json();
	if (!res.ok) throw new Error(data?.error || 'Error');
	return data.signedUrl as string;
}

export default function DocumentDetailDrawer({
	document,
	open,
	onClose,
	isStaff,
	sharedWithUserId,
	onDocumentUpdated,
}: Props) {
	const [localDocument, setLocalDocument] =
		React.useState<DocumentDashboardRow | null>(null);
	const [events, setEvents] = React.useState<DocumentEvent[]>([]);
	const [eventsLoading, setEventsLoading] = React.useState(false);
	const [downloading, setDownloading] = React.useState(false);
	const [opening, setOpening] = React.useState(false);
	const [historyOpen, setHistoryOpen] = React.useState(false);

	React.useEffect(() => {
		if (document) setLocalDocument(document);
	}, [document?.id, open]);

	React.useEffect(() => {
		if (!document?.id || !open) return;
		setEventsLoading(true);
		fetch(
			`/api/documents/events?documentId=${encodeURIComponent(document.id)}`,
			{ credentials: 'include' },
		)
			.then((r) => r.json())
			.then((data) => setEvents(Array.isArray(data.events) ? data.events : []))
			.catch(() => setEvents([]))
			.finally(() => setEventsLoading(false));
	}, [document?.id, open]);

	const uploaderLabel = React.useMemo(() => {
		const ev = events.find((e) => e.event_type === 'uploaded');
		if (!ev) return '—';
		return ev.actor_name || actorRoleLabel(ev.actor_role);
	}, [events]);

	const hasActiveShare = React.useMemo(() => {
		if (!localDocument || !sharedWithUserId) return false;
		return localDocument.shares.some(
			(s) =>
				s.shared_with_user_id === sharedWithUserId &&
				s.share_status === 'active',
		);
	}, [localDocument, sharedWithUserId]);

	const activeSharesCount = localDocument
		? localDocument.shares.filter((s) => s.share_status === 'active').length
		: 0;

	const handleDownload = async () => {
		if (!localDocument) return;
		setDownloading(true);
		try {
			const url = await fetchSignedUrl(localDocument.id);
			window.open(url, '_blank');
		} catch {
			toast.error('No se pudo descargar el documento');
		} finally {
			setDownloading(false);
		}
	};

	const handleOpenPreview = async () => {
		if (!localDocument) return;
		setOpening(true);
		try {
			const url = await fetchSignedUrl(localDocument.id);
			window.open(url, '_blank');
		} catch {
			toast.error('No se pudo abrir el documento');
		} finally {
			setOpening(false);
		}
	};

	const handleShare = async () => {
		if (!localDocument || !isStaff || !sharedWithUserId) return;
		const toastId = toast.loading('Compartiendo documento…');
		try {
			const res = await fetch('/api/documents/share', {
				method: 'POST',
				credentials: 'include',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					documentId: localDocument.id,
					sharedWithUserId,
				}),
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data?.error || 'Error');

			const existing = localDocument.shares.find(
				(s) => s.shared_with_user_id === sharedWithUserId,
			);
			const newShares = existing
				? localDocument.shares.map((s) =>
						s.shared_with_user_id === sharedWithUserId
							? {
									...s,
									share_status: 'active',
									shared_at: new Date().toISOString(),
								}
							: s,
					)
				: [
						...localDocument.shares,
						{
							id: data.shareId ?? crypto.randomUUID(),
							shared_with_user_id: sharedWithUserId,
							share_status: 'active',
							shared_at: new Date().toISOString(),
						},
					];
			const updated = { ...localDocument, shares: newShares };
			setLocalDocument(updated);
			onDocumentUpdated?.(updated);
			toast.success('Acceso compartido con el cliente', { id: toastId });
		} catch {
			toast.error('No se pudo compartir el documento', { id: toastId });
		}
	};

	const handleRevoke = async () => {
		if (!localDocument || !isStaff) return;
		const toastId = toast.loading('Revocando acceso…');
		try {
			const res = await fetch('/api/documents/revoke-share', {
				method: 'POST',
				credentials: 'include',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					documentId: localDocument.id,
					sharedWithUserId,
				}),
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data?.error || 'Error');

			const newShares = localDocument.shares.map((s) => {
				if (sharedWithUserId && s.shared_with_user_id !== sharedWithUserId)
					return s;
				return { ...s, share_status: 'revoked' };
			});
			const updated = { ...localDocument, shares: newShares };
			setLocalDocument(updated);
			onDocumentUpdated?.(updated);
			toast.success('Acceso revocado', { id: toastId });
		} catch {
			toast.error('No se pudo revocar el acceso', { id: toastId });
		}
	};

	const mime = localDocument?.mime_type ?? null;

	return (
		<Sheet
			open={open}
			onOpenChange={(o) => {
				if (!o) {
					onClose();
					setHistoryOpen(false);
				}
			}}
		>
			<SheetContent
				side="right"
				showCloseButton={true}
				className="!w-full overflow-y-auto !p-0 sm:!max-w-[400px]"
			>
				{/* Header */}
				<SheetHeader className="p-0">
					<div className="border-b border-gray-200 px-5 py-5 dark:border-gray-800">
						{/* Badges */}
						<div className="flex flex-wrap items-center gap-2">
							{localDocument ? (
								<Badge
									variant={badgeVariant(localDocument.status)}
									className="w-fit"
								>
									{statusLabel(localDocument.status)}
								</Badge>
							) : (
								<Skeleton className="h-5 w-20" />
							)}
						</div>

						{/* Icon + title */}
						{localDocument ? (
							<div className="mt-3 flex items-start gap-3">
								<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100 dark:bg-neutral-800">
									<Icon
										icon={getMimeIcon(localDocument.mime_type ?? null)}
										className="h-5 w-5 text-gray-500 dark:text-gray-400"
									/>
								</div>
								<div className="min-w-0 flex-1">
									<SheetTitle className="text-[16px] font-semibold leading-snug text-gray-900 dark:text-gray-100">
										{localDocument.file_title ?? localDocument.file_name ?? '—'}
									</SheetTitle>
									<p className="mt-0.5 text-[11.5px] text-gray-500 dark:text-gray-400">
										{localDocument.document_type?.name ?? 'Sin tipo'}
									</p>
								</div>
							</div>
						) : (
							<div className="mt-3 flex items-start gap-3">
								<Skeleton className="h-10 w-10 shrink-0 rounded-lg" />
								<div className="min-w-0 flex-1 space-y-1.5">
									<Skeleton className="h-5 w-40" />
									<Skeleton className="h-3.5 w-24" />
								</div>
							</div>
						)}
					</div>
					{/* History section */}
					<section className="border-b border-gray-200 dark:border-gray-800">
						<button
							type="button"
							onClick={() => setHistoryOpen((prev) => !prev)}
							className="flex w-full items-center justify-between p-4"
						>
							<p className="flex items-center gap-2 text-[10px] font-semibold tracking-wider text-gray-500 uppercase dark:text-gray-400">
								<Icon icon="ri:history-line" className="h-3.5 w-3.5" />
								Historial de acciones
							</p>
							<Icon
								icon="ri:arrow-down-s-line"
								className={cn(
									'h-4 w-4 text-gray-400 transition-transform duration-300 ease-in-out',
									historyOpen && 'rotate-180',
								)}
							/>
						</button>

						{/* Animación grid-template-rows 0fr→1fr: expande sin conocer la altura */}
						<div
							className={cn(
								'grid transition-[grid-template-rows,opacity] duration-300 ease-in-out',
								historyOpen
									? 'grid-rows-[1fr] opacity-100'
									: 'grid-rows-[0fr] opacity-0',
							)}
						>
							<div className="overflow-hidden">
								<ScrollArea className="h-56">
									<ScrollBar />
									{eventsLoading ? (
										<div className="space-y-3 p-3">
											{[0, 1, 2].map((i) => (
												<div key={i} className="flex gap-3">
													<Skeleton className="h-6 w-6 rounded-full" />
													<div className="flex-1 space-y-1.5">
														<Skeleton className="h-3 w-2/3" />
														<Skeleton className="h-3 w-1/2" />
													</div>
												</div>
											))}
										</div>
									) : events.length === 0 ? (
										<p className="p-4 text-center text-xs text-gray-500 dark:text-gray-400">
											Sin eventos registrados
										</p>
									) : (
										<div className="divide-y divide-gray-100 dark:divide-gray-800">
											{events.map((ev, index) => (
												<div
													key={ev.id}
													className="flex gap-3 px-3 py-2.5 transition-opacity duration-200"
													style={{
														transitionDelay: historyOpen
															? `${index * 40}ms`
															: '0ms',
													}}
												>
													<div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
														<Icon
															icon={eventTypeIcon(ev.event_type)}
															className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400"
														/>
													</div>
													<div className="min-w-0 flex-1">
														<p className="text-[12px] font-medium text-gray-900 dark:text-white">
															{eventTypeLabel(ev.event_type)}
														</p>
														<p className="text-[11px] text-gray-500 dark:text-gray-400">
															{formatDateTime(ev.created_at)}
														</p>
														<p className="text-[11px] text-gray-400 dark:text-gray-500">
															{ev.actor_name
																? `${ev.actor_name} · ${actorRoleLabel(ev.actor_role)}`
																: actorRoleLabel(ev.actor_role)}
														</p>
														{ev.notes && (
															<p className="mt-0.5 text-[11px] text-gray-400 italic dark:text-gray-500">
																{ev.notes}
															</p>
														)}
													</div>
												</div>
											))}
										</div>
									)}
								</ScrollArea>
							</div>
						</div>
					</section>
				</SheetHeader>

				{/* File section */}
				<section className="border-b border-gray-200 px-5 py-5 dark:border-gray-800">
					<p className="mb-3 text-[10px] font-semibold tracking-wider text-gray-500 uppercase dark:text-gray-400">
						Archivo
					</p>
					{localDocument ? (
						<div className="flex items-center gap-3 rounded-md border border-gray-200 px-3 py-2.5 dark:border-gray-800">
							<div
								className={cn(
									'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
									getMimeBg(mime),
								)}
							>
								<Icon
									icon={getMimeIcon(mime)}
									className={cn('h-4.5 w-4.5', getMimeColor(mime))}
								/>
							</div>
							<div className="min-w-0 flex-1">
								<button
									type="button"
									onClick={handleOpenPreview}
									disabled={opening}
									className="hover:text-primary-600 dark:hover:text-primary-400 block w-full truncate text-left text-[12px] font-medium text-gray-900 hover:underline disabled:opacity-60 dark:text-white"
								>
									{localDocument.file_title ?? localDocument.file_name}
								</button>
								<p className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">
									{formatFileSize(localDocument.file_size_bytes)}
									{opening && ' · Abriendo…'}
								</p>
							</div>
							<Button
								type="button"
								variant="ghost"
								size="icon-sm"
								onClick={handleDownload}
								disabled={downloading}
								className="shrink-0 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
							>
								<Icon icon="ri:download-2-line" className="h-4 w-4" />
								<span className="sr-only">Descargar</span>
							</Button>
						</div>
					) : (
						<div className="flex items-center gap-3 rounded-md border border-gray-200 px-3 py-2.5 dark:border-gray-800">
							<Skeleton className="h-9 w-9 rounded-lg" />
							<div className="flex-1 space-y-2">
								<Skeleton className="h-3 w-3/4" />
								<Skeleton className="h-3 w-1/3" />
							</div>
						</div>
					)}
					<div className="mt-4 grid grid-cols-3 gap-2">
						<MiniStat
							label="Tamaño"
							value={formatFileSize(localDocument?.file_size_bytes)}
						/>
						<MiniStat
							label="Visibilidad"
							value={
								localDocument?.visibility === 'client_visible'
									? 'Cliente'
									: 'Interno'
							}
						/>
						<MiniStat
							label="Categoría"
							value={legalCategoryLabel(
								localDocument?.document_type?.legal_category,
							)}
						/>
					</div>
				</section>

				{/* Details section */}
				<section className="border-b border-gray-200 px-5 py-5 dark:border-gray-800">
					<p className="mb-3 text-[10px] font-semibold tracking-wider text-gray-500 uppercase dark:text-gray-400">
						Detalles
					</p>
					{localDocument ? (
						<div className="space-y-1.5">
							<InfoRow label="Subido por" value={uploaderLabel} />
							<InfoRow
								label="Fecha de subida"
								value={formatDate(localDocument.uploaded_at)}
							/>
							{localDocument.issue_date && (
								<InfoRow
									label="Fecha de emisión"
									value={formatDate(localDocument.issue_date)}
								/>
							)}
							{localDocument.expiry_date && (
								<InfoRow
									label="Vence"
									value={
										<span
											className={cn(
												new Date(localDocument.expiry_date) < new Date()
													? 'text-red-600 dark:text-red-400'
													: '',
											)}
										>
											{formatDate(localDocument.expiry_date)}
										</span>
									}
								/>
							)}
							{localDocument.notes && (
								<div className="rounded-md border border-gray-200 px-3 py-2.5 dark:border-gray-800">
									<p className="mb-1 text-[10px] font-semibold tracking-wider text-gray-500 uppercase dark:text-gray-400">
										Notas
									</p>
									<p className="text-[11.5px] text-gray-700 italic dark:text-gray-300">
										{localDocument.notes}
									</p>
								</div>
							)}
						</div>
					) : (
						<div className="space-y-1.5">
							{[0, 1, 2, 3].map((i) => (
								<Skeleton key={i} className="h-9 w-full rounded-md" />
							))}
						</div>
					)}
				</section>

				{/* Shares section */}
				{localDocument && localDocument.shares.length > 0 && (
					<section className="border-b border-gray-200 px-5 py-5 dark:border-gray-800">
						<div className="mb-3 flex items-center gap-2">
							<p className="text-[10px] font-semibold tracking-wider text-gray-500 uppercase dark:text-gray-400">
								Compartido con
							</p>
							<span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
								{activeSharesCount} activo
								{activeSharesCount !== 1 ? 's' : ''}
							</span>
						</div>
						<div className="space-y-1.5">
							{localDocument.shares.map((share) => (
								<div
									key={share.id}
									className="flex items-center gap-2.5 rounded-md border border-gray-200 px-3 py-2.5 dark:border-gray-800"
								>
									<div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
										<Icon
											icon="ri:user-line"
											className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400"
										/>
									</div>
									<span className="flex-1 text-[11.5px] text-gray-700 dark:text-gray-300">
										{share.shared_with_user_id === sharedWithUserId
											? 'Cliente'
											: `${share.shared_with_user_id.slice(0, 8)}…`}
									</span>
									<Badge
										variant={
											share.share_status === 'active' ? 'susess' : 'standar'
										}
										className="shrink-0"
									>
										{share.share_status === 'active' ? 'Activo' : 'Revocado'}
									</Badge>
									{share.shared_at && (
										<span className="shrink-0 text-[10.5px] text-gray-400 dark:text-gray-500">
											{new Date(share.shared_at).toLocaleDateString('es-ES')}
										</span>
									)}
								</div>
							))}
						</div>
					</section>
				)}

				{/* Footer */}
				<SheetFooter className="sticky bottom-0 mt-auto grid grid-cols-2 gap-2 border-t border-gray-200 bg-white px-5 py-3 dark:border-gray-800 dark:bg-neutral-950">
					<Button type="button" onClick={handleDownload} disabled={downloading}>
						<Icon icon="ri:download-2-line" />
						{downloading ? 'Descargando…' : 'Descargar'}
					</Button>

					{isStaff &&
						sharedWithUserId &&
						(hasActiveShare ? (
							<Button
								type="button"
								variant="destructive"
								size="sm"
								onClick={handleRevoke}
							>
								<Icon icon="ri:forbid-line" className="h-4 w-4" />
								Revocar acceso
							</Button>
						) : (
							<Button type="button" variant="outline" onClick={handleShare}>
								<Icon icon="ri:share-forward-line" className="h-4 w-4" />
								Compartir con cliente
							</Button>
						))}

					{isStaff &&
						!sharedWithUserId &&
						localDocument &&
						localDocument.shares.length > 0 && (
							<Button
								type="button"
								variant="destructive"
								onClick={handleRevoke}
							>
								<Icon icon="ri:forbid-line" className="h-4 w-4" />
								Revocar acceso
							</Button>
						)}
				</SheetFooter>
			</SheetContent>
		</Sheet>
	);
}
