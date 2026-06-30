export interface SubMenuItem {
	id: string;
	label: string;
	href: string;
	svgname: string;
}

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
	children?: SubMenuItem[];
}

export const menuItems: MenuItem[] = [
	{
		id: 'llc',
		label: 'Crea una LLC',
		href: '/start/',
		tooltip: 'Crea una nueva LLC',
		roles: ['cliente', 'partner'],
		svgname: 'ri:rocket-line',
		sequence: 10,
		group: 'Company',
		colors: 'text-cyan-700',
	},
	{
		id: 'partners',
		label: 'Partners',
		href: '/partners/referrals/',
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
		href: '/partners/settings/',
		tooltip: 'Configuración de partner',
		roles: ['partner'],
		svgname: 'ri:award-line',
		sequence: 60,
		group: 'Partner Hub',
		colors: 'text-emerald-700',
	},
	{
		id: 'partners-soporte',
		label: 'Consultas',
		href: '/consultations/',
		tooltip: 'Agenda una reunion con Sotomayor Consulting',
		roles: ['cliente', 'partner'],
		svgname: 'ri:question-answer-line',
		sequence: 70,
		group: 'Company',
		colors: 'text-cyan-700',
	},
	{
		id: 'crud-users',
		label: 'Usuarios',
		href: '/admin/usuarios',
		tooltip: 'Gestionar usuarios',
		roles: ['admin', 'operaciones'],
		svgname: 'ri:group-line',
		sequence: 90,
		group: 'Admin',
		colors: 'text-violet-500',
	},
	{
		id: 'crud-incorporaciones',
		label: 'Incorporaciones',
		href: '/admin/incorporaciones',
		tooltip: 'Procesos de incorporación de LLCs',
		roles: ['admin', 'operaciones'],
		svgname: 'ri:file-list-3-line',
		sequence: 100,
		group: 'Admin',
		colors: 'text-violet-500',
	},
	{
		id: 'crud-empresas',
		label: 'Empresas',
		href: '/admin/empresas',
		tooltip: 'Entidades legales constituidas',
		roles: ['admin', 'operaciones'],
		svgname: 'ri:building-2-line',
		sequence: 110,
		group: 'Admin',
		colors: 'text-violet-500',
	},
	{
		id: 'crud-servicios',
		label: 'Servicios',
		href: '/admin/services/',
		tooltip: 'Gestionar servicios',
		roles: ['admin'],
		svgname: 'ri:function-add-line',
		sequence: 130,
		group: 'Admin',
		colors: 'text-violet-500'
	},
	{
		id: 'menu-vista-de-pagos',
		label: 'Ordenes',
		href: '/admin/payments/',
		tooltip: 'Verifica y gestiona las ordenes de los clientes',
		roles: ['admin'],
		svgname: 'ri:shopping-bag-4-line',
		sequence: 150,
		group: 'Admin',
		colors: 'text-violet-500',
	},
	{
		id: 'admin-settings',
		label: 'Ajustes',
		href: '/profile/',
		tooltip: 'Configuración del sistema',
		roles: ['admin', 'operaciones'],
		svgname: 'ri:settings-3-line',
		sequence: 160,
		group: 'Admin',
		colors: 'text-violet-500',
		children: [
			{
				id: 'admin-profile',
				label: 'Perfil',
				href: '/profile/',
				svgname: 'ri:user-3-line',
			},
			{
				id: 'settings-templates',
				label: 'Plantillas',
				href: '/admin/settings/templates',
				svgname: 'ri:file-text-line',
			},
		],
	},
	{
		id: 'otros-servicios',
		label: 'Otros servicios',
		href: '/services/',
		tooltip: 'Explora otros servicios disponibles',
		roles: ['cliente', 'partner'],
		svgname: 'ri:dashboard-horizontal-line',
		sequence: 170,
		group: 'Servicios',
	},
	{
		id: 'user-settings',
		label: 'Ajustes',
		href: '/profile/',
		tooltip: 'Configuración de tu cuenta',
		roles: ['cliente', 'partner'],
		svgname: 'ri:settings-3-line',
		sequence: 200,
		group: 'Cuenta',
		children: [
			{
				id: 'user-profile',
				label: 'Perfil',
				href: '/profile/',
				svgname: 'ri:user-3-line',
			},
			{
				id: 'user-billing',
				label: 'Facturación',
				href: '/profile/billing/',
				svgname: 'ri:bank-card-line',
			},
			{
				id: 'user-notifications',
				label: 'Notificaciones',
				href: '/profile/notifications/',
				svgname: 'ri:notification-3-line',
			},
			{
				id: 'user-security',
				label: 'Seguridad',
				href: '/profile/security/',
				svgname: 'ri:shield-line',
			}
		],
	},
];
