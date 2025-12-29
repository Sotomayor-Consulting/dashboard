export const prerender = false;

import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';

const BACK_PATH = '/start/';

export const POST: APIRoute = async ({ request, cookies, redirect, url }) => {
	try {
		const back = url.searchParams.get('back') || BACK_PATH;

		// 1) Sesión
		const at = cookies.get('sb-access-token');
		const rt = cookies.get('sb-refresh-token');
		if (at && rt) {
			await supabase.auth.setSession({
				access_token: at.value,
				refresh_token: rt.value,
			});
			const { data: userRes } = await supabase.auth.getUser();
			if (userRes?.user) {
				return redirect('/');
			}
		}

		// 2) Form data
		const form = await request.formData();
		const tipo_de_empresa = form.get('tipo_de_empresa')?.toString();
		const estado_de_empresa = form.get('estado_de_empresa')?.toString();
		const nombre_1 = form.get('nombre_1')?.toString();
		const nombre_2 = form.get('nombre_2')?.toString();
		const nombre_3 = form.get('nombre_3')?.toString();
		const estado_de = form.get('estado_de')?.toString();

		// 3) Validaciones
		if (!tipo_de_empresa) {
			return redirect(
				`${back}?status=error&msg=${encodeURIComponent('El tipo de empresa es obligatorio')}`,
			);
		}
		if (!estado_de_empresa) {
			return redirect(
				`${back}?status=error&msg=${encodeURIComponent('El estado de incorporación es obligatorio')}`,
			);
		}
		if (!nombre_1) {
			return redirect(
				`${back}?status=error&msg=${encodeURIComponent('El nombre 1 es obligatorio')}`,
			);
		}
		if (!nombre_2) {
			return redirect(
				`${back}?status=error&msg=${encodeURIComponent('El nombre 2 es obligatorio')}`,
			);
		}
		if (!nombre_3) {
			return redirect(
				`${back}?status=error&msg=${encodeURIComponent('El nombre 3 es obligatorio')}`,
			);
		}

		// 4) OK (el cliente guarda en localStorage)
		return redirect(`${back}?status=auth_required`);
	} catch (e: any) {
		const msg = typeof e?.message === 'string' ? e.message : 'Error inesperado';
		return redirect(`${BACK_PATH}?status=error&msg=${encodeURIComponent(msg)}`);
	}
};
