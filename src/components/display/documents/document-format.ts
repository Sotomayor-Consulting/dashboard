/**
 * Formateadores compartidos del dominio documentos (labels de estado,
 * variantes de badge, iconos por mime type). Ver docs/ui-conventions.md:
 * estos helpers se definen una sola vez y se importan desde todas las vistas
 * (admin y cliente) — nunca duplicarlos en islands.
 */

export const DOCUMENT_STATUS_LABEL: Record<string, string> = {
	pending: 'Pendiente',
	uploaded: 'Subido',
	under_review: 'En revisión',
	approved: 'Aprobado',
	rejected: 'Rechazado',
	replaced: 'Reemplazado',
	expired: 'Vencido',
	archived: 'Archivado',
};

export function documentStatusLabel(status: string): string {
	return DOCUMENT_STATUS_LABEL[status] ?? status;
}

/** Variante de `Badge` de @components/ui según estado del documento. */
export function documentStatusVariant(status: string) {
	if (status === 'approved') return 'susess';
	if (status === 'under_review' || status === 'uploaded') return 'standar';
	if (status === 'rejected' || status === 'expired') return 'danger';
	return 'warning';
}

export function documentMimeIcon(mime: string | null): string {
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

export function documentMimeBg(mime: string | null): string {
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

export function documentMimeColor(mime: string | null): string {
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

/** Fecha corta es-ES con fallback `—` (convención de formato de datos). */
export function formatDocumentDate(value?: string | null): string {
	if (!value) return '—';
	const d = new Date(value);
	if (Number.isNaN(d.getTime())) return value;
	return d.toLocaleDateString('es-ES', {
		year: 'numeric',
		month: 'short',
		day: '2-digit',
	});
}
