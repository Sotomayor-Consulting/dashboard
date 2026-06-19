export const prerender = false;

import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '@infrastructure/supabase';
import { safeBack } from '@infrastructure/security/headers';

const BACK_PATH = '/';

export const POST: APIRoute = async ({ request, cookies, redirect, url }) => {
	try {
		const back = safeBack(url.searchParams.get('back'), BACK_PATH);

		// 1) Cliente Supabase SSR
		const supabase = createSupabaseServerClient({
			headers: request.headers,
			cookies,
		});

		// 2) Usuario
		const {
			data: { user: actor },
			error: uerr,
		} = await supabase.auth.getUser();
		if (uerr || !actor) {
			return redirect(
				`${back}?status=error&msg=${encodeURIComponent('No autenticado')}`,
			);
		}

		// 3) Form data
		const form = await request.formData();
		const tipo_de_empresa = form.get('tipo_de_empresa')?.toString();
		const estado_de_empresa = form.get('estado_de_empresa')?.toString();
		const nombre_1 = form.get('nombre_1')?.toString() || '';
		const nombre_2 = form.get('nombre_2')?.toString() || '';
		const nombre_3 = form.get('nombre_3')?.toString() || '';
		const estado_de = form.get('estado_de')?.toString();

		// 4) Validaciones - CORREGIDAS
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

		// Validar que al menos un nombre no esté vacío - CORREGIDO
		const nombres = [nombre_1, nombre_2, nombre_3];
		const alMenosUnNombre = nombres.some(
			(nombre) => nombre && nombre.trim() !== '',
		);
		if (!alMenosUnNombre) {
			return redirect(
				`${back}?status=error&msg=${encodeURIComponent('Al menos un nombre de empresa es obligatorio')}`,
			);
		}

		// 5) Insert
		const { error } = await supabase.from('incorporations').insert([
			{
				user_id: actor.id,
				entity_type: tipo_de_empresa,
				principal_name: nombre_1.trim() || null,
				possible_names: [
					...new Set(nombres.map((n) => n.trim()).filter(Boolean)),
				],
				state: estado_de,
				porcentaje_de_incorporacion: 1,
			},
		]);

		if (error) {
			return redirect(
				`${back}?status=error&msg=${encodeURIComponent('DB: ' + error.message)}`,
			);
		}

		// 6) OK
		return redirect(
			`${back}?status=success&msg=${encodeURIComponent('Empresa registrada')}`,
		);
	} catch (e: any) {
		const msg = typeof e?.message === 'string' ? e.message : 'Error inesperado';
		return redirect(`${BACK_PATH}?status=error&msg=${encodeURIComponent(msg)}`);
	}
};
