export const prerender = false;

import type { APIRoute } from 'astro';
import { notifyByEvent } from '@infrastructure/notifications';
import type { NotificationChannel } from '@infrastructure/notifications';

export const POST: APIRoute = async ({ request, locals }) => {
	const json = (body: object, status = 200) =>
		new Response(JSON.stringify(body), {
			status,
			headers: { 'Content-Type': 'application/json' },
		});

	try {
		const userRoles = locals.userRoles || [];
		if (!userRoles.includes('admin')) {
			return json({ success: false, error: 'No autorizado' }, 403);
		}

		const body = await request.json();
		const {
			userId,
			message,
			link,
			linkLabel,
			sendEmail,
			emailSubject,
			emailHtml,
		} = body as {
			userId?: string;
			message?: string;
			link?: string;
			linkLabel?: string;
			sendEmail?: boolean;
			emailSubject?: string;
			emailHtml?: string;
		};

		if (!userId) return json({ success: false, error: 'Falta userId' }, 400);
		if (!message?.trim())
			return json({ success: false, error: 'El mensaje es requerido' }, 400);

		const channels: NotificationChannel[] = sendEmail
			? ['in_app', 'email']
			: ['in_app'];

		const result = await notifyByEvent({
			eventKey: 'admin.custom',
			recipients: [{ userId }],
			channels,
			link: link ?? null,
			linkLabel: linkLabel ?? 'Ver detalle',
			context: {
				message: message.trim(),
				link_label: linkLabel ?? 'Ver detalle',
				email_subject: emailSubject || 'Tienes una nueva notificacion',
				email_html:
					emailHtml ||
					`<p>Hola,</p><p>${message.trim()}</p>${link ? `<p><a href="${link}">${linkLabel || 'Ver detalle'}</a></p>` : ''}`,
				email_text: message.trim(),
			},
		});

		const failures = result.results
			.flatMap((r) => r.channels)
			.filter((c) => !c.success)
			.map((c) => `${c.channel}: ${c.error}`);

		if (result.totalSuccess === 0) {
			return json(
				{
					success: false,
					error: failures.join(' | ') || 'No se pudo enviar la notificacion',
				},
				500,
			);
		}

		if (failures.length > 0) {
			return json({
				success: true,
				warning: `Enviado con errores parciales: ${failures.join(', ')}`,
			});
		}

		return json({ success: true });
	} catch (e: any) {
		console.error('[notifications/send] unexpected error', e);
		return json({ success: false, error: e?.message ?? 'Error inesperado' }, 500);
	}
};
