export const menuItems = [
	{
		id: 'llc',
		label: 'Crea una LLC',
		href: '/start/',
		tooltip: 'Crea una nueva LLC',
		roles: ['cliente', 'partner'],
		svgname: 'ri:building-2-fill',
		sequence: 10
	},
	{
		id: 'companias',
		label: 'Tus compañias',
		href: '/pages/companias',
		tooltip: 'Mira tus compañias y su estado',
		roles: ['cliente', 'partner'],
		svgname: 'ri:hand-coin-fill',
		sequence: 30
	},
	{
		id: 'documentos',
		label: 'Documentos',
		href: '/pages/tus-formularios',
		tooltip: 'Mira tus documentos y formularios',
		roles: ['cliente', 'partner'],
		svgname: 'ri:file-copy-2-line',
		sequence: 40
	},
	{
		id: 'partners',
		label: 'Partners',
		href: '/partners/datos-referidos/',
		tooltip: 'Mira tus referidos',
		roles: ['partner'],
		svgname: 'ri:shake-hands-fill',
		sequence: 50
	},
	{
		id: 'partners-configuracion',
		label: 'Configuracion',
		href: '/partners/configuracion-partners/',
		tooltip: 'Configuracion de partner',
		roles: ['partner'],
		svgname: 'ri:settings-3-fill',
		sequence: 60
	},

	{
		id: 'partners-soporte',
		label: 'Agendar',
		href: 'https://zcal.co/t/agendar-asesoria-llc/60min',
		tooltip: 'Agenda una reunion con Sotomayor Consulting',
		roles: ['cliente', 'partner'],
		svgname: 'ri:calendar-fill',
		sequence: 70
	},
	{
		id: 'partners-configuracion-perfil',
		label: 'Perfil',
		href: '/settings/',
		tooltip: 'Configure su perfil y datos',
		roles: ['all'],
		svgname: 'ri:account-circle-fill',
		sequence: 80
	},
	{
		id: 'crud-users',
		label: 'Clientes',
		href: '/crud/users',
		tooltip: 'Gestionar clientes',
		roles: ['admin'],
		svgname: 'ri:user-add-fill',
		sequence: 90
	},
	{
		id: 'crud-empresas',
		label: 'Empresas',
		href: '/crud/empresas',
		tooltip: 'Gestionar clientes',
		roles: ['admin'],
		svgname: 'ri:building-2-fill',
		sequence: 100
	},
	{
		id: 'verificacion-formulario-incorp',
		label: 'Incorporación',
		href: '/crud/verficacion-incorporacion',
		tooltip: 'Gestiona y verifica los datos del formulario de incorporación',
		roles: ['admin'],
		svgname: 'ri:archive-stack-fill',
		sequence: 110
	},
	{
		id: 'menu-vista-de-pagos',
		label: 'Pagos',
		href: '/crud/pagos',
		tooltip: 'verifica y gestiona los pagos realizados por los clientes',
		roles: ['admin'],
		svgname: 'ri:coins-fill',
		sequence: 120
	},
	{
		id: 'menu-subir-documentos-de-usuario',
		label: 'subir docs',
		href: '/crud/subir-documentos',
		tooltip: 'Sube documentos específicos para los clientes',
		roles: ['admin'],
		svgname: 'ri:upload-cloud-2-fill',
		sequence: 130
	},
	{
		id: 'menu-notificaciones-a-usuarios',
		label: 'Notificaciones',
		href: '/crud/notificaciones-personalizadas',
		tooltip: 'Notifica a los usuarios con mensajes personalizados',
		roles: ['admin'],
		svgname: 'ri:chat-ai-4-fill',
		sequence: 140
	},
	{
		id: 'crud-servicios',
		label: 'Servicios',
		href: '/crud/services',
		tooltip: 'Gestionar servicios',
		roles: ['admin'],
		svgname: 'ri:function-add-fill',
		sequence: 150
	},
	{
		id: 'crud-formularios',
		label: 'Formularios',
		href: '/crud/formularios',
		tooltip: 'Crea y gestiona formularios',
		roles: ['admin'],
		svgname: 'ri:file-edit-fill',
		sequence: 160
	},
	{
		id: 'crud-formularios-enviados',
		label: 'Docs Enviados',
		href: '/crud/formularios-enviados',
		tooltip: 'Gestiona las respuestas y estados de documentos',
		roles: ['admin'],
		svgname: 'ri:file-check-fill',
		sequence: 170
	},
	{
		id: 'otros-servicios',
		label: 'Otros servicios',
		href: '/pages/otros-servicios',
		tooltip: 'Explora otros servicios disponibles',
		roles: ['cliente', 'partner'],
		svgname: 'ri:dashboard-horizontal-fill',
		sequence: 180
	},
	{
		id: 'companies',
		label: 'Empresas',
		href: '/companies',
		tooltip: 'Mira tus compañias y su estado',
		roles: ['cliente', 'partner', 'admin'],
		svgname: 'ri:building-4-fill',
		sequence: 300
	},
];
