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
		id: 'my-companies',
		label: 'Tus empresas',
		href: '/my-companies/',
		tooltip: 'Mira tus empresas',
		roles: ['cliente', 'partner'],
		svgname: 'ri:hand-coin-fill',
		sequence: 20
	},
	{
		id: 'documentos',
		label: 'Documentos',
		href: '/documentos/',
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
		href: '/usuarios/',
		tooltip: 'Gestionar clientes',
		roles: ['admin'],
		svgname: 'ri:user-add-fill',
		sequence: 90
	},
	{
		id: 'crud-empresas',
		label: 'Empresas',
		href: '/companies/',
		tooltip: 'Gestionar empresas',
		roles: ['admin'],
		svgname: 'ri:building-2-fill',
		sequence: 100
	},
	{
		id: 'verificacion-formulario-incorp',
		label: 'Incorporación',
		href: '/admin/verificacion/',
		tooltip: 'Gestiona y verifica los datos del formulario de incorporación',
		roles: ['admin'],
		svgname: 'ri:archive-stack-fill',
		sequence: 110
	},
	{
		id: 'menu-vista-de-pagos',
		label: 'Pagos',
		href: '/admin/pagos/',
		tooltip: 'verifica y gestiona los pagos realizados por los clientes',
		roles: ['admin'],
		svgname: 'ri:coins-fill',
		sequence: 120
	},
	{
		id: 'menu-subir-documentos-de-usuario',
		label: 'subir docs',
		href: '/admin/subir-documentos/',
		tooltip: 'Sube documentos específicos para los clientes',
		roles: ['admin'],
		svgname: 'ri:upload-cloud-2-fill',
		sequence: 130
	},
	{
		id: 'menu-notificaciones-a-usuarios',
		label: 'Notificaciones',
		href: '/admin/notificaciones/',
		tooltip: 'Notifica a los usuarios con mensajes personalizados',
		roles: ['admin'],
		svgname: 'ri:chat-ai-4-fill',
		sequence: 140
	},
	{
		id: 'crud-servicios',
		label: 'Servicios',
		href: '/admin/servicios/',
		tooltip: 'Gestionar servicios',
		roles: ['admin'],
		svgname: 'ri:function-add-fill',
		sequence: 150
	},
	{
		id: 'crud-formularios',
		label: 'Formularios',
		href: '/formularios/',
		tooltip: 'Crea y gestiona formularios',
		roles: ['admin'],
		svgname: 'ri:file-edit-fill',
		sequence: 160
	},
	{
		id: 'crud-formularios-enviados',
		label: 'Docs Enviados',
		href: '/formularios/enviados/',
		tooltip: 'Gestiona las respuestas y estados de documentos',
		roles: ['admin'],
		svgname: 'ri:file-check-fill',
		sequence: 170
	},
	{
		id: 'otros-servicios',
		label: 'Otros servicios',
		href: '/servicios/',
		tooltip: 'Explora otros servicios disponibles',
		roles: ['cliente', 'partner'],
		svgname: 'ri:dashboard-horizontal-fill',
		sequence: 180
	},
];
