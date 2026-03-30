export const prerender = false;

import type { APIRoute } from 'astro';
// Ajusta esta ruta si tu estructura es distinta:
import { createSupabaseServerClient } from '@lib/supabase';
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

		// 4) Build payload
		const payload: Record<string, any> = {
			user_id: userId,
			message: message,
			link: link,
			mensaje_link: linkDescription,
			created_at: new Date().toISOString(),
		};

		// 5) Insert en tabla notifications
		const { error } = await supabase.from('notifications').insert(payload);

		if (error) {
			const msg = encodeURIComponent(`DB: ${error.message}`);
			return redirect(`${back}?status=error&msg=${msg}`);
		}

		return redirect(
			`${back}?status=success&msg=${encodeURIComponent('Notificación enviada correctamente')}`,
		);
	} catch (e: any) {
		const msg = encodeURIComponent(`Error inesperado: ${e?.message ?? e}`);
		return redirect(`${back}?status=error&msg=${msg}`);
	}
};
