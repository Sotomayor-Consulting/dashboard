export const prerender = false;

import type { APIRoute } from 'astro';
// Ajusta esta ruta si tu estructura es distinta:
import { supabase } from '@lib/supabase';

const BACK_PATH = '/crud/notificaciones-personalizadas';

export const POST: APIRoute = async ({ request, cookies, redirect, url }) => {
	const back = url.searchParams.get('back') || BACK_PATH;

	try {
		// 1) Sesión
		const at = cookies.get('sb-access-token');
		const rt = cookies.get('sb-refresh-token');
		if (!at || !rt) {
			return redirect(
				`${back}?status=error&msg=${encodeURIComponent('No autenticado')}`,
			);
		}
		await supabase.auth.setSession({
			access_token: at.value,
			refresh_token: rt.value,
		});

		// 2) Actor + check admin
		const { data: userRes, error: userErr } = await supabase.auth.getUser();
		const actor = userRes?.user;
		if (userErr || !actor) {
			return redirect(
				`${back}?status=error&msg=${encodeURIComponent('No autenticado')}`,
			);
		}

		const { data: isAdminRes, error: rpcErr } = await supabase.rpc('is_admin', {
			uid: actor.id,
		});
		const isAdmin = !rpcErr && Boolean(isAdminRes);
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
