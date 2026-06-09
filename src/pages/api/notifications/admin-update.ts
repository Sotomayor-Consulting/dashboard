export const prerender = false;

import type { APIRoute } from 'astro';
// Ajusta esta ruta si tu estructura es distinta:
import { createSupabaseServerClient } from '@infrastructure/supabase';
import { notifyByEvent } from '@infrastructure/notifications';
import type { NotificationChannel } from '@infrastructure/notifications';
import { safeBack } from '@infrastructure/security/headers';
import { createLogger } from '@infrastructure/logging';

const log = createLogger('admin-notifications-update');

const BACK_PATH = '/admin/notifications/';

export const POST: APIRoute = async ({ request, cookies, redirect, url, locals }) => {
	const back = safeBack(url.searchParams.get('back'), BACK_PATH);

	try {
		// 1) Sesión
		const supabase = createSupabaseServerClient({ headers: request.headers, cookies });

		// 2) Actor + check admin desde locals
		const { data: { user: actor }, error: userErr } = await supabase.auth.getUser();
		if (userErr || !actor) {
			return redirect(
				`${back}?status=error&msg=${encodeURIComponent('No autenticado')}`,
			);
		}

		const userRoles = locals.userRoles || [];
		const isAdmin = userRoles.includes('admin');
		if (!isAdmin) {
			return redirect(
				`${back}?status=error&msg=${encodeURIComponent('No autorizado')}`,
			);
		}

		// 3) Form data
		const form = await request.formData();
		const userId = form.get('user_id_modal_name')?.toString();
		const message = form.get('mensaje-notificacion')?.toString().trim();
		const link = form.get('link-notificacion')?.toString().trim();
		const linkDescription = form
			.get('descripcion-link-notificacion')
			?.toString()
			.trim();
		const sendEmail = form.has('send_email');
		const emailSubject = form.get('email_subject')?.toString().trim();
		const emailHtml = form.get('email_html')?.toString().trim();

		// Validación de campos requeridos
		if (!userId) {
			return redirect(
				`${back}?status=error&msg=${encodeURIComponent('Falta user_id de destino')}`,
			);
		}

		if (!message) {
			return redirect(
				`${back}?status=error&msg=${encodeURIComponent('El mensaje es requerido')}`,
			);
		}

		const channels: NotificationChannel[] = sendEmail
			? ['in_app', 'email']
			: ['in_app'];

		const notificationResult = await notifyByEvent({
			eventKey: 'admin.custom',
			recipients: [{ userId }],
			channels,
			link: link ?? null,
			linkLabel: linkDescription ?? 'Ver detalle',
			context: {
				message,
				link_label: linkDescription ?? 'Ver detalle',
				email_subject: emailSubject || 'Tienes una nueva notificacion',
				email_html:
					emailHtml ||
					`<p>Hola,</p><p>${message}</p>${link ? `<p><a href="${link}">${linkDescription || 'Ver detalle'}</a></p>` : ''}`,
				email_text: message,
			},
		});

		// Recolectamos errores de todos los canales fallidos
		const channelFailures = notificationResult.results
			.flatMap((r) => r.channels)
			.filter((c) => !c.success)
			.map((c) => `${c.channel}: ${c.error}`);

		if (notificationResult.totalSuccess === 0) {
			const details = channelFailures.join(' | ');
			log.error('all channels failed', {
				userId,
				channels,
				channelFailures,
			});
			return redirect(
				`${back}?status=error&msg=${encodeURIComponent(details || 'No se pudo enviar la notificacion')}`,
			);
		}

		if (channelFailures.length > 0) {
			log.error('partial channel failures', {
				userId,
				channels,
				channelFailures,
			});
			const warning = `Notificación enviada con errores parciales: ${channelFailures.join(', ')}`;
			return redirect(
				`${back}?status=warning&msg=${encodeURIComponent(warning)}`,
			);
		}

		return redirect(
			`${back}?status=success&msg=${encodeURIComponent('Notificación enviada correctamente')}`,
		);
	} catch (e: any) {
		log.error('unexpected error', { error: e });
		const msg = encodeURIComponent(`Error inesperado: ${e?.message ?? e}`);
		return redirect(`${back}?status=error&msg=${msg}`);
	}
};
