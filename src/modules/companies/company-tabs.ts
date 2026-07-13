import type { TabButton } from '@components/navigation/TabBar.astro';

export type CompanyClientTabId = 'company' | 'documents' | 'members';

/**
 * Tabs compartidos de la vista cliente de una empresa constituida
 * (`/company/[id]`).
 */
export function companyClientTabs(
	companyId: string,
	active: CompanyClientTabId,
): TabButton[] {
	const base = `/company/${companyId}`;
	return [
		{
			label: 'Empresa',
			icon: 'ri:building-2-line',
			kind: 'link',
			link: base,
			active: active === 'company',
		},
		{
			label: 'Documentos',
			icon: 'ri:file-copy-line',
			kind: 'link',
			link: `${base}/documents`,
			active: active === 'documents',
		},
		{
			label: 'Miembros',
			icon: 'ri:group-line',
			kind: 'link',
			link: `${base}/members`,
			active: active === 'members',
		},
	];
}
