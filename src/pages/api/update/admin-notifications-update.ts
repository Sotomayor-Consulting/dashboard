export const prerender = false;

import type { APIRoute } from 'astro';
// Ajusta esta ruta si tu estructura es distinta:
import { createSupabaseServerClient } from '@lib/supabase';
import { notifyByEvent } from '@lib/notifications';
import type { NotificationChannel } from '@lib/notifications';
import { safeBack } from '@lib/security/headers';

const BACK_PATH = '/admin/notificaciones/';

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
		const sendEmail =
			form.get('send_email')?.toString().trim().toLowerCase() === 'true';
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

		if (notificationResult.totalSuccess === 0) {
			const details = notificationResult.results
				.flatMap((row) => row.channels)
				.map((channel) => channel.error)
				.filter(Boolean)
				.join(' | ');
			return redirect(
				`${back}?status=error&msg=${encodeURIComponent(details || 'No se pudo enviar la notificacion')}`,
			);
		}

		return redirect(
			`${back}?status=success&msg=${encodeURIComponent('Notificación enviada correctamente')}`,
		);
	} catch (e: any) {
		const msg = encodeURIComponent(`Error inesperado: ${e?.message ?? e}`);
		return redirect(`${back}?status=error&msg=${msg}`);
	}
};
