export interface MenuItem {
	id: string;
	label: string;
	href: string;
	tooltip: string;
	roles: string[];
	svgname: string;
	sequence: number;
	colors?: string;
	group?: string;
}

export const menuItems: MenuItem[] = [
	{
		id: 'llc',
		label: 'Crea una LLC',
		href: '/start/',
		tooltip: 'Crea una nueva LLC',
		roles: ['cliente', 'partner'],
		svgname: 'ri:building-2-line',
		sequence: 10,
		group: 'Company',
		colors: 'text-cyan-700',
	},
	{
		id: 'partners',
		label: 'Partners',
		href: '/partners/datos-referidos/',
		tooltip: 'Mira tus referidos',
		roles: ['partner'],
		svgname: 'ri:shake-hands-line',
		sequence: 50,
		group: 'Partner Hub',
		colors: 'text-emerald-700',
	},
	{
		id: 'partners-configuracion',
		label: 'Estado Partner',
		href: '/partners/configuracion-partners/',
		tooltip: 'Configuración de partner',
		roles: ['partner'],
		svgname: 'ri:award-line',
		sequence: 60,
		group: 'Partner Hub',
		colors: 'text-emerald-700',
	},
	{
		id: 'partners-soporte',
		label: 'Agendar',
		href: 'https://zcal.co/t/agendar-asesoria-llc/60min',
		tooltip: 'Agenda una reunion con Sotomayor Consulting',
		roles: ['cliente', 'partner'],
		svgname: 'ri:calendar-line',
		sequence: 70,
		group: 'Company',
		colors: 'text-cyan-700',
	},
	{
		id: 'crud-users',
		label: 'Clientes',
		href: '/usuarios/',
		tooltip: 'Gestionar clientes',
		roles: ['admin'],
		svgname: 'ri:user-add-line',
		sequence: 90,
		group: 'Admin',
		colors: 'text-violet-500',
	},
	{
		id: 'crud-empresas',
		label: 'Empresas',
		href: '/incorporations/',
		tooltip: 'Gestionar empresas',
		roles: ['admin'],
		svgname: 'ri:building-2-line',
		sequence: 100,
		group: 'Admin',
		colors: 'text-violet-500'
	},
	{
		id: 'menu-vista-de-pagos',
		label: 'Pagos',
		href: '/admin/pagos/',
		tooltip: 'verifica y gestiona los pagos realizados por los clientes',
		roles: ['admin'],
		svgname: 'ri:coins-line',
		sequence: 120,
		group: 'Admin',
		colors: 'text-violet-500'
	},
	{
		id: 'menu-notificaciones-a-usuarios',
		label: 'Notificaciones',
		href: '/admin/notificaciones/',
		tooltip: 'Notifica a los usuarios con mensajes personalizados',
		roles: ['admin'],
		svgname: 'ri:chat-ai-line',
		sequence: 130,
		group: 'Admin',
		colors: 'text-violet-500'
	},
	{
		id: 'crud-servicios',
		label: 'Servicios',
		href: '/admin/servicios/',
		tooltip: 'Gestionar servicios',
		roles: ['admin'],
		svgname: 'ri:function-add-line',
		sequence: 140,
		group: 'Admin',
		colors: 'text-violet-500'
	},
	{
		id: 'crud-formularios',
		label: 'Formularios',
		href: '/formularios/',
		tooltip: 'Crea y gestiona formularios',
		roles: ['admin'],
		svgname: 'ri:file-edit-line',
		sequence: 150,
		group: 'Admin',
		colors: 'text-violet-500'
	},
	{
		id: 'otros-servicios',
		label: 'Otros servicios',
		href: '/servicios/',
		tooltip: 'Explora otros servicios disponibles',
		roles: ['cliente', 'partner'],
		svgname: 'ri:dashboard-horizontal-line',
		sequence: 170,
		group: 'Servicios',
	},
	{
		id: 'partners-configuracion-perfil',
		label: 'Perfil',
		href: '/settings/',
		tooltip: 'Configure su perfil y datos',
		roles: ['all'],
		svgname: 'ri:account-circle-line',
		sequence: 80,
		group: 'Cuenta'
	},
];
