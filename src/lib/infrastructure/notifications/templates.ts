import type { NotificationEventKey, NotificationTemplate } from './types';

const templates: NotificationTemplate[] = [
	{
		eventKey: 'admin.custom',
		locale: 'es',
		defaultChannels: ['in_app'],
		requiredContext: ['message'],
		inApp: {
			message: '{{message}}',
			actionLabel: '{{action_label}}',
		},
		email: {
			subject: '{{email_subject}}',
			html: '{{email_html}}',
			text: '{{email_text}}',
		},
	},
	{
		eventKey: 'documents.shared',
		locale: 'es',
		defaultChannels: ['in_app', 'email'],
		requiredContext: ['case_name', 'action_url'],
		inApp: {
			message:
				'Se compartio un documento de tu caso {{case_name}} para tu revision.',
			actionLabel: 'Ver documentos',
		},
		email: {
			subject: 'Nuevo documento disponible para {{case_name}}',
			html: '<p>Hola,</p><p>Ya tienes un nuevo documento compartido para <strong>{{case_name}}</strong>.</p><p><a href="{{action_url}}">Ver documentos</a></p>',
			text: 'Tienes un nuevo documento compartido para {{case_name}}. Ingresa aqui: {{action_url}}',
		},
	},
	{
		eventKey: 'documents.share_revoked',
		locale: 'es',
		defaultChannels: ['in_app', 'email'],
		requiredContext: ['case_name', 'action_url'],
		inApp: {
			message:
				'Se revoco el acceso a un documento compartido del caso {{case_name}}.',
			actionLabel: 'Ver documentos',
		},
		email: {
			subject: 'Cambio de acceso en documentos de {{case_name}}',
			html: '<p>Hola,</p><p>Se actualizo el acceso a documentos del caso <strong>{{case_name}}</strong>.</p><p><a href="{{action_url}}">Ir a documentos</a></p>',
			text: 'Se actualizo el acceso a documentos del caso {{case_name}}. Ingresa aqui: {{action_url}}',
		},
	},
	{
		eventKey: 'workflow.stage.completed',
		locale: 'es',
		defaultChannels: ['in_app', 'email'],
		requiredContext: ['stage_name', 'company_name', 'action_url'],
		inApp: {
			message: 'Se completo la etapa "{{stage_name}}" para {{company_name}}.',
			actionLabel: 'Ver incorporacion',
		},
		email: {
			subject: 'Etapa completada: {{stage_name}}',
			html: '<p>Hola,</p><p>La etapa <strong>{{stage_name}}</strong> de la incorporacion <strong>{{company_name}}</strong> fue completada.</p><p><a href="{{action_url}}">Ver detalle</a></p>',
			text: 'La etapa {{stage_name}} de {{company_name}} fue completada. Ver detalle: {{action_url}}',
		},
	},
	{
		eventKey: 'workflow.planning.doc_uploaded',
		locale: 'es',
		defaultChannels: ['in_app', 'email'],
		requiredContext: ['company_name', 'action_url'],
		inApp: {
			message:
				'Tu documento de planificacion y diseno esta listo para revision en {{company_name}}.',
			actionLabel: 'Revisar documento',
		},
		email: {
			subject:
				'Documento de planificacion listo para revision - {{company_name}}',
			html: '<p>Hola,</p><p>Operaciones subio el documento de planificacion y diseno para <strong>{{company_name}}</strong>. Por favor revisa y aprueba o rechaza el documento.</p><p><a href="{{action_url}}">Revisar documento</a></p>',
			text: 'Operaciones subio el documento de planificacion para {{company_name}}. Revisa aqui: {{action_url}}',
		},
	},
	{
		eventKey: 'workflow.planning.doc_approved',
		locale: 'es',
		defaultChannels: ['in_app', 'email'],
		requiredContext: ['company_name', 'action_url'],
		inApp: {
			message:
				'El cliente aprobo el documento de planificacion de {{company_name}}.',
			actionLabel: 'Ver incorporacion',
		},
		email: {
			subject: 'Planificacion aprobada por el cliente - {{company_name}}',
			html: '<p>Hola,</p><p>El cliente aprobo el documento de planificacion para <strong>{{company_name}}</strong>. La etapa avanza al siguiente paso.</p><p><a href="{{action_url}}">Ver incorporacion</a></p>',
			text: 'El cliente aprobo la planificacion de {{company_name}}. Ver detalle: {{action_url}}',
		},
	},
	{
		eventKey: 'workflow.planning.doc_rejected',
		locale: 'es',
		defaultChannels: ['in_app', 'email'],
		requiredContext: ['company_name', 'action_url', 'comments'],
		inApp: {
			message:
				'El cliente rechazo el documento de planificacion de {{company_name}}. Comentarios: {{comments}}',
			actionLabel: 'Revisar comentarios',
		},
		email: {
			subject: 'Planificacion rechazada por el cliente - {{company_name}}',
			html: '<p>Hola,</p><p>El cliente rechazo el documento de planificacion para <strong>{{company_name}}</strong>.</p><p><strong>Comentarios del cliente:</strong></p><blockquote>{{comments}}</blockquote><p><a href="{{action_url}}">Subir nueva version</a></p>',
			text: 'El cliente rechazo la planificacion de {{company_name}}. Comentarios: {{comments}} - Ver: {{action_url}}',
		},
	},
	{
		eventKey: 'workflow.task.assigned',
		locale: 'es',
		defaultChannels: ['in_app', 'email'],
		requiredContext: ['task_name', 'company_name', 'action_url'],
		inApp: {
			message:
				'Tienes una nueva tarea asignada: "{{task_name}}" para {{company_name}}.',
			actionLabel: 'Ver tarea',
		},
		email: {
			subject: 'Nueva tarea asignada: {{task_name}}',
			html: '<p>Hola,</p><p>Se te asigno la tarea <strong>{{task_name}}</strong> para <strong>{{company_name}}</strong>.</p><p><a href="{{action_url}}">Abrir tarea</a></p>',
			text: 'Se te asigno la tarea {{task_name}} para {{company_name}}. Abrir tarea: {{action_url}}',
		},
	},
];

function findTemplate(
	eventKey: NotificationEventKey,
	locale: string,
): NotificationTemplate | null {
	return (
		templates.find(
			(template) =>
				template.eventKey === eventKey && template.locale === locale,
		) ?? null
	);
}

export function getNotificationTemplate(
	eventKey: NotificationEventKey,
	locale = 'es',
): NotificationTemplate {
	const exact = findTemplate(eventKey, locale);
	if (exact) return exact;

	const spanishFallback = findTemplate(eventKey, 'es');
	if (spanishFallback) return spanishFallback;

	throw new Error(`No existe plantilla para evento: ${eventKey}`);
}
