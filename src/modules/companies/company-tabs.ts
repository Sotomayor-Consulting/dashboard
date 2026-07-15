import type { TabButton } from '@components/navigation/TabBar.astro';

export type CompanyClientTabId = 'company' | 'documents' | 'members';
export type CompanyAdminView = 'general' | 'members' | 'documents';

/**
 * Tabs de la vista admin de una empresa (`/admin/companies/[id]`).
 * En la vista general, Información y Direcciones son panels client-side;
 * desde las demás vistas son links de vuelta.
 */
export function companyAdminTabs(
	companyId: string,
	view: CompanyAdminView,
): TabButton[] {
	const base = `/admin/companies/${companyId}`;
	const onGeneral = view === 'general';
	return [
		{
			label: 'Información',
			icon: 'ri:file-edit-line',
			kind: onGeneral ? 'panel' : 'link',
			id: 'informacion',
			link: base,
			active: onGeneral,
		},
		{
			label: 'Direcciones',
			icon: 'ri:map-pin-line',
			kind: onGeneral ? 'panel' : 'link',
			id: 'direcciones',
			link: `${base}?tab=direcciones`,
			active: false,
		},
		{
			label: 'Miembros',
			icon: 'ri:group-line',
			kind: 'link',
			link: `${base}/members`,
			active: view === 'members',
		},
		{
			label: 'Documentos',
			icon: 'ri:file-copy-line',
			kind: 'link',
			link: `${base}/documents`,
			active: view === 'documents',
		},
	];
}

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
