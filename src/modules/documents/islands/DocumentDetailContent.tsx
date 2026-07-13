import * as React from 'react';
import { Badge } from '@components/ui/Badge';
import { Button } from '@components/ui/Button';
import { Separator } from '@components/ui/Separator';
import { cn } from '@components/utils';
import { Icon } from '@iconify/react';
import type { DocumentDashboardRow } from '@domains/documents/document_dashboard';

interface DocumentEvent {
	id: string;
	event_type: string;
	actor_role: string;
	notes: string | null;
	created_at: string;
}

interface Props {
	document: DocumentDashboardRow | null;
	events: DocumentEvent[];
	backPath: string;
	variant: 'staff' | 'client';
	isLoading?: boolean;
	error?: string | null;
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

function InfoCard({ label, value }: { label: string; value: React.ReactNode }) {
	return (
		<div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-transparent">
			<p className="mb-1 text-xs text-gray-500 dark:text-gray-400">{label}</p>
			<p className="text-sm font-medium text-gray-900 dark:text-white">
				{value ?? '—'}
			</p>
		</div>
	);
}

export default function DocumentDetailContent({
	document,
	events,
	backPath,
	isLoading,
	error,
}: Props) {
	const [historyOpen, setHistoryOpen] = React.useState(true);
	const [downloading, setDownloading] = React.useState(false);

	const uploaderLabel = React.useMemo(() => {
		const ev = events.find((e) => e.event_type === 'uploaded');
		return ev ? actorRoleLabel(ev.actor_role) : '—';
	}, [events]);

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

	if (isLoading) {
		return (
			<div className="mx-auto max-w-4xl space-y-4 p-4">
				<div className="h-4 w-32 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
				<div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-transparent">
					<div className="mb-4 flex items-center gap-4">
						<div className="h-12 w-12 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
						<div className="flex-1 space-y-2">
							<div className="h-5 w-3/4 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
							<div className="h-4 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
						</div>
					</div>
					<div className="grid gap-4 md:grid-cols-3">
						{[...Array(6)].map((_, i) => (
							<div
								key={i}
								className="h-16 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-700"
							/>
						))}
					</div>
				</div>
			</div>
		);
	}

	if (error || !document) {
		return (
			<div className="mx-auto max-w-4xl p-4">
				<div className="rounded-xl border border-dashed border-gray-200 p-8 text-center dark:border-gray-700">
					<Icon
						icon="ri:error-warning-line"
						className="mx-auto mb-3 h-10 w-10 text-gray-400 dark:text-gray-500"
					/>
					<p className="text-sm text-gray-600 dark:text-gray-400">
						{error ?? 'Documento no encontrado'}
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="mx-auto max-w-4xl space-y-5 p-4">
			<a
				href={backPath}
				className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
			>
				<Icon icon="ri:arrow-left-line" className="h-4 w-4" />
				Volver a documentos
			</a>

			<div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-transparent">
				<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
					<div className="flex min-w-0 items-start gap-4">
						<div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/30">
							<Icon
								icon={getMimeIcon(document.mime_type)}
								className="h-7 w-7 text-blue-500 dark:text-blue-400"
							/>
						</div>
						<div className="min-w-0">
							<h1 className="truncate text-xl font-semibold text-gray-900 dark:text-white">
								{document.file_title ?? document.file_name}
							</h1>
							<div className="mt-2 flex flex-wrap items-center gap-2">
								<Badge variant={badgeVariant(document.status)}>
									{statusLabel(document.status)}
								</Badge>
								{document.document_type && (
									<span className="text-xs text-gray-500 dark:text-gray-400">
										{document.document_type.code} —{' '}
										{document.document_type.name}
									</span>
								)}
							</div>
						</div>
					</div>
					<Button
						type="button"
						onClick={handleDownload}
						disabled={downloading}
						className="shrink-0 gap-2"
					>
						<Icon icon="ri:download-2-line" className="h-4 w-4" />
						{downloading ? 'Descargando…' : 'Descargar'}
					</Button>
				</div>
			</div>

			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				<InfoCard
					label="Tipo de documento"
					value={document.document_type?.name ?? 'Sin tipo'}
				/>
				<InfoCard
					label="Categoría legal"
					value={legalCategoryLabel(
						document.document_type?.legal_category,
					)}
				/>
				<InfoCard
					label="Visibilidad"
					value={visibilityLabel(document.visibility)}
				/>
				<InfoCard
					label="Fecha de subida"
					value={formatDate(document.uploaded_at)}
				/>
				<InfoCard
					label="Tamaño"
					value={formatFileSize(document.file_size_bytes)}
				/>
				<InfoCard label="Subido por" value={uploaderLabel} />
			</div>

			<div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-transparent">
				<button
					type="button"
					onClick={() => setHistoryOpen((prev) => !prev)}
					className="flex w-full items-center justify-between py-1"
				>
					<span className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
						<Icon
							icon="ri:history-line"
							className="h-4 w-4 text-gray-500 dark:text-gray-400"
						/>
						Historial de acciones
						<span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400">
							{events.length}
						</span>
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
					<>
						<Separator className="my-3" />
						{events.length === 0 ? (
							<p className="py-6 text-center text-xs text-gray-500 dark:text-gray-400">
								Sin eventos registrados
							</p>
						) : (
							<div className="space-y-0">
								{events.map((ev, idx) => (
									<div key={ev.id} className="relative flex gap-4 pb-6 last:pb-0">
										<div className="flex flex-col items-center">
											<div
												className={cn(
													'flex h-8 w-8 items-center justify-center rounded-full',
													ev.event_type === 'approved'
														? 'bg-green-100 text-green-600 dark:bg-green-950/30 dark:text-green-400'
														: ev.event_type === 'rejected'
															? 'bg-red-100 text-red-600 dark:bg-red-950/30 dark:text-red-400'
															: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
												)}
											>
												<Icon
													icon={eventTypeIcon(ev.event_type)}
													className="h-4 w-4"
												/>
											</div>
											{idx < events.length - 1 && (
												<div className="mt-1 h-full w-px bg-gray-200 dark:bg-gray-700" />
											)}
										</div>
										<div className="min-w-0 flex-1 pt-1">
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
					</>
				)}
			</div>
		</div>
	);
}
