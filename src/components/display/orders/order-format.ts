// Helpers compartidos para las vistas de órdenes (admin y cliente).
// Única fuente de verdad para labels de estado, variantes de Badge y formatos.

export const ORDER_STATUS_LABEL: Record<string, string> = {
	draft: 'Borrador',
	pending_payment: 'Pago pendiente',
	confirmed: 'Pagada',
	canceled: 'Cancelada',
};

export type OrderStatusVariant = 'susess' | 'warning' | 'destructive';

export function orderStatusVariant(status: string): OrderStatusVariant {
	if (status === 'confirmed') return 'susess';
	if (status === 'canceled') return 'destructive';
	return 'warning';
}

export function formatUsd(value: number | null | undefined): string {
	if (typeof value !== 'number') return '—';
	return value.toLocaleString('en-US', {
		style: 'currency',
		currency: 'USD',
		minimumFractionDigits: 2,
	});
}

// Los timestamps se guardan en UTC en la BD; estos helpers se ejecutan en
// islands de React (browser), así que toLocale* convierte automáticamente
// a la zona horaria local del usuario.
export function formatDate(value: string | null | undefined): string {
	if (!value) return '—';
	const d = new Date(value);
	if (Number.isNaN(d.getTime())) return value;
	return d.toLocaleDateString('es-ES', {
		year: 'numeric',
		month: 'short',
		day: '2-digit',
	});
}

export function formatDateTime(value: string | null | undefined): string {
	if (!value) return '—';
	const d = new Date(value);
	if (Number.isNaN(d.getTime())) return value;
	return d.toLocaleString('es-ES', {
		year: 'numeric',
		month: 'short',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
	});
}
