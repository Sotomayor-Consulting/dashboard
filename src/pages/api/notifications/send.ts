export const prerender = false;

import type { APIRoute } from 'astro';
import { notifyByEvent } from '@infrastructure/notifications';
import type { NotificationChannel } from '@infrastructure/notifications';
import { sanitizeNotificationHtml } from '@shared/sanitize';

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
			title,
			message,
			action_url: actionUrl,
			action_label: actionLabel,
			sendEmail,
		} = body as {
			userId?: string;
			title?: string;
			message?: string;
			action_url?: string;
			action_label?: string;
			sendEmail?: boolean;
		};

		if (!userId) return json({ success: false, error: 'Falta userId' }, 400);
		if (!title?.trim())
			return json({ success: false, error: 'El título es requerido' }, 400);
		if (!message?.trim())
			return json({ success: false, error: 'El mensaje es requerido' }, 400);

		const channels: NotificationChannel[] = sendEmail
			? ['in_app', 'email']
			: ['in_app'];

		// El mensaje del form es HTML (editor). Sanitizamos con allowlist y
		// derivamos una versión en texto plano para la parte `text` del correo.
		const html = sanitizeNotificationHtml(message.trim());
		const text = html
			.replace(/<[^>]+>/g, ' ')
			.replace(/\s+/g, ' ')
			.trim();

		const result = await notifyByEvent({
			eventKey: 'admin.custom',
			recipients: [{ userId }],
			channels,
			title: title.trim(),
			actionUrl: actionUrl ?? null,
			actionLabel: actionLabel ?? 'Ver detalle',
			context: {
				message: html,
				action_label: actionLabel ?? 'Ver detalle',
				email_subject: title.trim(),
				email_html: html,
				email_text: text,
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
		return json(
			{ success: false, error: e?.message ?? 'Error inesperado' },
			500,
		);
	}
};
