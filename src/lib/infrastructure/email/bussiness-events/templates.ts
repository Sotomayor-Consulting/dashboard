import type {
	BusinessEmailPayload,
	BusinessEmailTemplateData,
	BusinessEmailCaseContext,
} from './types';

function formatClientName(clientName: string | null): string {
	return clientName?.trim() || 'cliente';
}

function formatDueDate(value: string | null | undefined): string | null {
	if (!value) return null;
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) return value;
	return parsed.toLocaleDateString('es-EC', {
		year: 'numeric',
		month: 'long',
		day: 'numeric',
	});
}

function buildTitle(clientName: string | null): string {
	return `${formatClientName(clientName)}, tiene una nueva actualización de su proceso con Sotomayor Consulting.`;
}

function buildCommonText(data: {
	title: string;
	intro: string;
	highlightLabel: string;
	highlightValue: string;
	details: string;
	ctaNote: string;
	ctaLabel: string;
	ctaUrl: string;
}): string {
	return [
		data.title,
		'',
		data.intro,
		`${data.highlightLabel}: ${data.highlightValue}`,
		data.details,
		data.ctaNote,
		`${data.ctaLabel}: ${data.ctaUrl}`,
	].join('\n');
}

export function buildBusinessEmailTemplate(
	payload: BusinessEmailPayload,
	context: BusinessEmailCaseContext,
): BusinessEmailTemplateData {
	const title = buildTitle(context.clientName);
	const ctaUrl =
		payload.actionUrl?.trim() || `/incorporation/${context.caseId}`;

	if (payload.eventKey === 'workflow.task.completed') {
		const taskName = payload.taskName?.trim() || 'Actualización de tarea';
		const intro = `Le informamos que se ha completado una nueva tarea dentro del proceso de ${context.companyName}.`;
		const highlightLabel = 'Tarea completada';
		const highlightValue = taskName;
		const details =
			'Nuestro equipo ha registrado un nuevo avance en su proceso. Puede revisar el estado actualizado desde su panel.';
		const ctaNote =
			'Para consultar el detalle, ingrese al enlace seguro a continuación.';
		const ctaLabel = 'Ver avance';
		return {
			subject: 'Actualización de su proceso de incorporación',
			title,
			intro,
			highlightLabel,
			highlightValue,
			details,
			ctaNote,
			ctaLabel,
			ctaUrl,
			text: buildCommonText({
				title,
				intro,
				highlightLabel,
				highlightValue,
				details,
				ctaNote,
				ctaLabel,
				ctaUrl,
			}),
		};
	}

	if (payload.eventKey === 'documents.requested') {
		const dueDate = formatDueDate(payload.dueDate);
		const intro = `Le informamos que hemos generado una nueva solicitud de documentos para continuar con el proceso de ${context.companyName}.`;
		const highlightLabel = 'Documento requerido';
		const highlightValue = dueDate
			? `Fecha sugerida de entrega: ${dueDate}`
			: 'Hay documentación pendiente por cargar';
		const details = payload.message?.trim()
			? payload.message.trim()
			: 'Por favor revise el requerimiento y cargue la información solicitada a la brevedad para evitar demoras en su proceso.';
		const ctaNote =
			'Puede atender esta solicitud desde su panel de documentos.';
		const ctaLabel = 'Subir documento';
		return {
			subject: 'Solicitud de documento para su proceso',
			title,
			intro,
			highlightLabel,
			highlightValue,
			details,
			ctaNote,
			ctaLabel,
			ctaUrl,
			text: buildCommonText({
				title,
				intro,
				highlightLabel,
				highlightValue,
				details,
				ctaNote,
				ctaLabel,
				ctaUrl,
			}),
		};
	}

	if (payload.eventKey === 'documents.shared') {
		const intro = `Le informamos que tiene un nuevo documento disponible dentro del proceso de ${context.companyName}.`;
		const highlightLabel = 'Documento disponible';
		const highlightValue = 'Ya puede revisarlo desde su panel';
		const details =
			'El documento ha sido cargado por nuestro equipo y ya se encuentra disponible para su consulta.';
		const ctaNote = 'Para revisar el documento, utilice el siguiente acceso.';
		const ctaLabel = 'Ver documentos';
		return {
			subject: 'Nuevo documento disponible para revision',
			title,
			intro,
			highlightLabel,
			highlightValue,
			details,
			ctaNote,
			ctaLabel,
			ctaUrl,
			text: buildCommonText({
				title,
				intro,
				highlightLabel,
				highlightValue,
				details,
				ctaNote,
				ctaLabel,
				ctaUrl,
			}),
		};
	}

	if (payload.eventKey === 'incorporation.submitted') {
		const intro = `Le confirmamos que hemos recibido correctamente su solicitud para ${context.companyName}.`;
		const highlightLabel = 'Solicitud recibida';
		const highlightValue = context.companyName;
		const details =
			'Su información ya fue registrada en nuestros sistemas y nuestro equipo continuara con la siguiente etapa de revision.';
		const ctaNote =
			'Puede dar seguimiento al estado de su solicitud desde el siguiente enlace.';
		const ctaLabel = 'Ver solicitud';
		return {
			subject: 'Hemos recibido su solicitud',
			title,
			intro,
			highlightLabel,
			highlightValue,
			details,
			ctaNote,
			ctaLabel,
			ctaUrl,
			text: buildCommonText({
				title,
				intro,
				highlightLabel,
				highlightValue,
				details,
				ctaNote,
				ctaLabel,
				ctaUrl,
			}),
		};
	}

	if (payload.eventKey === 'payment.succeeded') {
		const serviceName = payload.serviceName?.trim() || 'su servicio contratado';
		const intro = `Le confirmamos que hemos recibido correctamente el pago relacionado con ${context.companyName}.`;
		const highlightLabel = 'Pago confirmado';
		const highlightValue = serviceName;
		const details =
			'Su pago fue registrado exitosamente y continuaremos con las siguientes etapas de su proceso.';
		const ctaNote =
			'Puede revisar el avance actualizado desde el siguiente acceso.';
		const ctaLabel = 'Ver avance';
		return {
			subject: 'Pago confirmado de su proceso',
			title,
			intro,
			highlightLabel,
			highlightValue,
			details,
			ctaNote,
			ctaLabel,
			ctaUrl,
			text: buildCommonText({
				title,
				intro,
				highlightLabel,
				highlightValue,
				details,
				ctaNote,
				ctaLabel,
				ctaUrl,
			}),
		};
	}

	if (payload.eventKey === 'form.submitted') {
		const intro = `Le confirmamos que hemos recibido correctamente el formulario de ${context.companyName}.`;
		const highlightLabel = 'Formulario enviado';
		const highlightValue = 'La información fue recibida correctamente';
		const details =
			'Nuestro equipo revisará la información enviada y continuará con el siguiente paso del proceso.';
		const ctaNote =
			'Puede consultar el estado actualizado desde el siguiente acceso.';
		const ctaLabel = 'Ver solicitud';
		return {
			subject: 'Hemos recibido su formulario',
			title,
			intro,
			highlightLabel,
			highlightValue,
			details,
			ctaNote,
			ctaLabel,
			ctaUrl,
			text: buildCommonText({
				title,
				intro,
				highlightLabel,
				highlightValue,
				details,
				ctaNote,
				ctaLabel,
				ctaUrl,
			}),
		};
	}

	const intro = `Le informamos que su solicitud para ${context.companyName} ha sido validada por nuestro equipo.`;
	const highlightLabel = 'Solicitud validada';
	const highlightValue = context.companyName;
	const details =
		'Su proceso continua avanzando y ya puede revisar la información actualizada desde su panel.';
	const ctaNote =
		'Para consultar el siguiente paso, utilice el siguiente acceso.';
	const ctaLabel = 'Ver detalle';

	return {
		subject: 'Su solicitud ha sido validada',
		title,
		intro,
		highlightLabel,
		highlightValue,
		details,
		ctaNote,
		ctaLabel,
		ctaUrl,
		text: buildCommonText({
			title,
			intro,
			highlightLabel,
			highlightValue,
			details,
			ctaNote,
			ctaLabel,
			ctaUrl,
		}),
	};
}
