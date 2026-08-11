/**
 * Helpers de presentación compartidos por las vistas de documentos
 * (tablas, drawers y formularios de subida). Única fuente de verdad para
 * iconos por MIME, labels de estado/categoría y formatos de fecha/tamaño.
 */

export type DocumentBadgeVariant = 'susess' | 'standar' | 'danger' | 'warning';

export const LEGAL_CATEGORY_LABELS: Record<string, string> = {
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

export function legalCategoryLabel(cat: string | null | undefined): string {
	if (!cat) return '—';
	return LEGAL_CATEGORY_LABELS[cat] ?? cat;
}

export function getMimeIcon(mime: string | null): string {
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

export function getMimeBg(mime: string | null): string {
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

export function getMimeColor(mime: string | null): string {
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

export function badgeForDocumentStatus(status: string): DocumentBadgeVariant {
	if (status === 'approved') return 'susess';
	if (
		status === 'under_review' ||
		status === 'uploaded' ||
		status === 'archived'
	)
		return 'standar';
	if (status === 'rejected' || status === 'expired') return 'danger';
	return 'warning';
}

export function badgeForSigned(isSigned: boolean): DocumentBadgeVariant {
	return isSigned ? 'susess' : 'standar';
}

export function signedLabel(isSigned: boolean): string {
	return isSigned ? 'Firmado' : 'Sin firmar';
}

export function statusLabel(status: string): string {
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

/**
 * Estados de `documents.document_requests`. Son un enum distinto al de los
 * documentos: incluye 'sent' y 'cancelled', y no tiene 'replaced'/'expired'.
 */
export function requestStatusLabel(status: string): string {
	const map: Record<string, string> = {
		pending: 'Borrador',
		sent: 'Enviada',
		uploaded: 'Documento recibido',
		under_review: 'En revisión',
		approved: 'Aprobada',
		rejected: 'Rechazada',
		cancelled: 'Cancelada',
	};
	return map[status] ?? status;
}

export function badgeForRequestStatus(status: string): DocumentBadgeVariant {
	if (status === 'approved') return 'susess';
	if (status === 'uploaded' || status === 'under_review') return 'standar';
	if (status === 'rejected' || status === 'cancelled') return 'danger';
	return 'warning';
}

/** Estados en los que la solicitud ya no espera acción del cliente. */
export const TERMINAL_REQUEST_STATUSES = new Set([
	'approved',
	'rejected',
	'cancelled',
]);

export function isRequestOpen(status: string): boolean {
	return !TERMINAL_REQUEST_STATUSES.has(status);
}

export function eventTypeLabel(type: string): string {
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

export function eventTypeIcon(type: string): string {
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

export function actorRoleLabel(role: string): string {
	const map: Record<string, string> = {
		admin: 'Administrador',
		operaciones: 'Equipo de Operaciones',
		cliente: 'Cliente',
	};
	return map[role] ?? role;
}

export function formatFileSize(bytes: number | null | undefined): string {
	if (!bytes) return '—';
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

// Timestamps de Supabase llegan como ISO 8601 UTC (timestamptz). Sin
// timeZone explícito Intl usa la del browser — lo correcto para display.
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

export function formatDate(iso: string | null | undefined): string {
	if (!iso) return '—';
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return iso;
	return dateFormatter.format(d);
}

export function formatDateTime(iso: string | null | undefined): string {
	if (!iso) return '—';
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return iso;
	return dateTimeFormatter.format(d);
}
