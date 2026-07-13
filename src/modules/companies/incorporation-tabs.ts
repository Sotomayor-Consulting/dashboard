import type { TabButton } from '@components/navigation/TabBar.astro';

export type IncorporationTabId = 'general' | 'documents' | 'orders';

/**
 * Tabs compartidos de la vista cliente de una incorporación
 * (`/incorporation/[id]`). El tab activo se renderiza como link igual que el
 * resto para que la navegación entre sub-páginas sea uniforme.
 */
export function incorporationTabs(
	incorporationId: string,
	active: IncorporationTabId,
): TabButton[] {
	const base = `/incorporation/${incorporationId}`;
	return [
		{
			label: 'General',
			icon: 'ri:apps-2-ai-line',
			kind: 'link',
			link: base,
			active: active === 'general',
		},
		{
			label: 'Documentos',
			icon: 'ri:file-copy-line',
			kind: 'link',
			link: `${base}/documents`,
			active: active === 'documents',
		},
		{
			label: 'Ordenes',
			icon: 'ri:contract-line',
			kind: 'link',
			link: `${base}/orders`,
			active: active === 'orders',
		},
	];
}
