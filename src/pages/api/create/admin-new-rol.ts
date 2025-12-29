// src/pages/api/admin/roles/create.ts
export const prerender = false;

import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';

const BACK_PATH = '/crud/users'; // Ajusta esta ruta según tu frontend

export const POST: APIRoute = async ({ request, cookies, redirect, url }) => {
	const back = url.searchParams.get('back') || BACK_PATH;

	try {
		// 1) Verificar sesión
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

		// 2) Verificar que el usuario es admin
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

		// 3) Obtener datos del formulario
		const form = await request.formData();
		const nombre = form.get('nombre_rol')?.toString().trim();

		if (!nombre) {
			return redirect(
				`${back}?status=error&msg=${encodeURIComponent('Falta el nombre del rol')}`,
			);
		}

		// 4) Preparar payload para insertar
		const payload: Record<string, any> = {
			nombre: nombre,
			created_at: new Date().toISOString(),
		};

		// 5) Insertar en la tabla roles
		const { error } = await supabase.from('roles').insert(payload).select();

		if (error) {
			const msg = encodeURIComponent(`Error al crear rol: ${error.message}`);
			return redirect(`${back}?status=error&msg=${msg}`);
		}

		return redirect(
			`${back}?status=success&msg=${encodeURIComponent('Rol creado correctamente')}`,
		);
	} catch (e: any) {
		const msg = encodeURIComponent(`Error inesperado: ${e?.message ?? e}`);
		return redirect(`${back}?status=error&msg=${msg}`);
	}
};
