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
import { Separator } from '@components/ui/Separator';
import { cn } from '@components/utils';
import { Icon } from '@iconify/react';
import type { DocumentDashboardRow } from '@domains/documents/document_dashboard';

interface Props {
	document: DocumentDashboardRow | null;
	open: boolean;
	onClose: () => void;
	isStaff: boolean;
	incorporationCaseId: string;
	sharedWithUserId?: string | undefined;
}

interface DocumentEvent {
	id: string;
	event_type: string;
	actor_role: string;
	notes: string | null;
	created_at: string;
}

function getMimeIcon(mime: string | null): string {
	if (!mime) return 'ri:file-line';
	if (mime === 'application/pdf') return 'ri:file-pdf-line';
	if (mime.includes('word') || mime.includes('document'))
		return 'ri:file-word-line';
	if (mime.includes('excel') || mime.includes('spreadsheet'))
		return 'ri:file-excel-line';
	if (mime.includes('powerpoint') || mime.includes('presentation'))
		return 'ri:file-ppt-line';
	if (mime.startsWith('image/')) return 'ri:image-line';
	if (mime.startsWith('text/')) return 'ri:file-text-line';
	return 'ri:file-line';
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

function formatFileSize(bytes: number | null): string {
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

function visibilityLabel(vis: string): string {
	return vis === 'client_visible' ? 'Visible al cliente' : 'Solo interno';
}

function formatDate(iso: string | null | undefined): string {
	if (!iso) return '—';
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return iso;
	return d.toLocaleDateString('es-ES', {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	});
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
	return (
		<div className="flex items-start justify-between gap-3 py-2.5">
			<span className="shrink-0 text-xs text-gray-500 dark:text-gray-400">
				{label}
			</span>
			<span className="text-right text-sm font-medium text-gray-900 dark:text-white">
				{value || '—'}
			</span>
		</div>
	);
}

export default function DocumentDetailDrawer({
	document,
	open,
	onClose,
	isStaff,
	sharedWithUserId,
}: Props) {
	const [events, setEvents] = React.useState<DocumentEvent[]>([]);
	const [eventsLoading, setEventsLoading] = React.useState(false);
	const [downloading, setDownloading] = React.useState(false);
	const [historyOpen, setHistoryOpen] = React.useState(false);

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
		return ev ? actorRoleLabel(ev.actor_role) : '—';
	}, [events]);

	const hasActiveShare = React.useMemo(() => {
		if (!document || !sharedWithUserId) return false;
		return document.shares.some(
			(s) =>
				s.shared_with_user_id === sharedWithUserId && s.share_status === 'active',
		);
	}, [document, sharedWithUserId]);

	const handleDownload = async () => {
		if (!document) return;
		setDownloading(true);
		try {
			const res = await fetch('/api/documents/signed-url', {
				method: 'POST',
				credentials: 'include',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ documentId: document.id }),
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data?.error || 'Error');
			window.open(data.signedUrl, '_blank');
		} catch {
			window.alert('No se pudo descargar el documento');
		} finally {
			setDownloading(false);
		}
	};

	const handleShare = async () => {
		if (!document || !isStaff || !sharedWithUserId) return;
		try {
			const res = await fetch('/api/documents/share', {
				method: 'POST',
				credentials: 'include',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					documentId: document.id,
					sharedWithUserId,
				}),
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data?.error || 'Error');
			window.location.reload();
		} catch {
			window.alert('No se pudo compartir el documento');
		}
	};

	const handleRevoke = async () => {
		if (!document || !isStaff) return;
		try {
			const res = await fetch('/api/documents/revoke-share', {
				method: 'POST',
				credentials: 'include',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					documentId: document.id,
					sharedWithUserId,
				}),
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data?.error || 'Error');
			window.location.reload();
		} catch {
			window.alert('No se pudo revocar el acceso');
		}
	};

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
			<SheetContent side="right" className="sm:!max-w-md !p-0 flex flex-col">
				<SheetHeader className="border-b border-gray-200 px-4 pb-3 pt-4 dark:border-gray-700">
					<div className="flex min-w-0 items-center gap-3">
						<Icon
							icon={getMimeIcon(document?.mime_type ?? null)}
							className="h-8 w-8 shrink-0 text-gray-400 dark:text-gray-500"
						/>
						<div className="min-w-0">
							<SheetTitle className="truncate text-base leading-tight">
								{document?.file_title ?? document?.file_name ?? '—'}
							</SheetTitle>
							{document && (
								<Badge
									variant={badgeVariant(document.status)}
									className="mt-1 w-fit"
								>
									{statusLabel(document.status)}
								</Badge>
							)}
						</div>
					</div>
				</SheetHeader>

				<div className="flex-1 overflow-y-auto">
					{/* Información del documento */}
					<div className="px-4 py-4">
						<p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
							Información del documento
						</p>
						{document && (
							<div className="divide-y divide-gray-100 dark:divide-gray-800">
								<InfoRow
									label="Nombre"
									value={document.file_title ?? document.file_name}
								/>
								<InfoRow
									label="Tipo de documento"
									value={document.document_type?.name ?? 'Sin tipo'}
								/>
								<InfoRow
									label="Categoría legal"
									value={legalCategoryLabel(
										document.document_type?.legal_category,
									)}
								/>
								<InfoRow
									label="Fecha de subida"
									value={formatDate(document.uploaded_at)}
								/>
								<InfoRow
									label="Tamaño"
									value={formatFileSize(document.file_size_bytes)}
								/>
								<InfoRow
									label="Visibilidad"
									value={visibilityLabel(document.visibility)}
								/>
								<InfoRow label="Subido por" value={uploaderLabel} />
							</div>
						)}
					</div>

					<Separator />

					{/* Historial collapsible */}
					<div className="px-4 py-3">
						<button
							type="button"
							onClick={() => setHistoryOpen((prev) => !prev)}
							className="flex w-full items-center justify-between rounded-lg py-1 text-sm font-semibold text-gray-900 dark:text-white"
						>
							<span className="flex items-center gap-2">
								<Icon
									icon="ri:history-line"
									className="h-4 w-4 text-gray-500 dark:text-gray-400"
								/>
								Historial de acciones
							</span>
							<Icon
								icon="ri:arrow-down-s-line"
								className={cn(
									'h-4 w-4 text-gray-400 transition-transform duration-200',
									historyOpen && 'rotate-180',
								)}
							/>
						</button>

						{historyOpen && (
							<ScrollArea className="mt-3 h-56 rounded-lg border border-gray-200 dark:border-gray-700">
								<ScrollBar />
								{eventsLoading ? (
									<div className="space-y-3 p-3">
										{[0, 1, 2].map((i) => (
											<div key={i} className="flex gap-3">
												<div className="h-6 w-6 shrink-0 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700" />
												<div className="flex-1 space-y-1.5">
													<div className="h-3 w-2/3 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
													<div className="h-3 w-1/2 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
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
										{events.map((ev) => (
											<div key={ev.id} className="flex gap-3 px-3 py-2.5">
												<div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
													<Icon
														icon={eventTypeIcon(ev.event_type)}
														className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400"
													/>
												</div>
												<div className="min-w-0 flex-1">
													<p className="text-sm font-medium text-gray-900 dark:text-white">
														{eventTypeLabel(ev.event_type)}
													</p>
													<p className="text-xs text-gray-500 dark:text-gray-400">
														{formatDate(ev.created_at)} ·{' '}
														{actorRoleLabel(ev.actor_role)}
													</p>
													{ev.notes && (
														<p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
															{ev.notes}
														</p>
													)}
												</div>
											</div>
										))}
									</div>
								)}
							</ScrollArea>
						)}
					</div>
				</div>

				<SheetFooter className="flex-col gap-2 border-t border-gray-200 px-4 py-3 dark:border-gray-700">
					<Button
						type="button"
						onClick={handleDownload}
						disabled={downloading}
						className="w-full gap-2"
					>
						<Icon icon="ri:download-2-line" className="h-4 w-4" />
						{downloading ? 'Descargando…' : 'Descargar'}
					</Button>
					{isStaff && sharedWithUserId && (
						hasActiveShare ? (
							<Button
								type="button"
								variant="outline"
								onClick={handleRevoke}
								className="w-full gap-2 border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/30"
							>
								<Icon icon="ri:forbid-line" className="h-4 w-4" />
								Revocar acceso
							</Button>
						) : (
							<Button
								type="button"
								variant="outline"
								onClick={handleShare}
								className="w-full gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
							>
								<Icon icon="ri:share-forward-line" className="h-4 w-4" />
								Compartir con cliente
							</Button>
						)
					)}
					{isStaff && !sharedWithUserId && (
						<Button
							type="button"
							variant="outline"
							onClick={handleRevoke}
							className="w-full gap-2 border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/30"
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
