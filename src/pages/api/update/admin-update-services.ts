// src/pages/api/admin/servicios/update.ts
export const prerender = false;

import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';

const BACK_PATH = '/crud/services'; // Ajusta esta ruta según tu frontend

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
		const servicioId = form.get('service_id')?.toString();

		if (!servicioId) {
			return redirect(
				`${back}?status=error&msg=${encodeURIComponent('Falta el ID del servicio')}`,
			);
		}

		// Campos a actualizar
		const nombre = form.get('nombre-service')?.toString().trim();
		const precioRaw = form.get('precio-servicio')?.toString().trim();
		const categoria = form.get('categoria-service')?.toString().trim();
		const descripcion = form.get('descripcion-service')?.toString().trim();

		// 4) Preparar payload para actualizar
		const payload: Record<string, any> = {
			created_at: new Date().toISOString(),
		};

		// Solo agregar campos si tienen valor
		if (nombre) payload.nombre = nombre;
		if (precioRaw) {
			const precio = Number(precioRaw);
			if (!Number.isNaN(precio)) payload.precio = precio;
		}
		if (categoria) payload.categoria = categoria;
		if (descripcion) payload.descripcion = descripcion;

		// Verificar que hay campos para actualizar
		if (Object.keys(payload).length === 1) {
			// Solo tiene updated_at
			return redirect(
				`${back}?status=success&msg=${encodeURIComponent('Sin cambios')}`,
			);
		}

		// 5) Actualizar el servicio
		const { error } = await supabase
			.from('servicios')
			.update(payload)
			.eq('id', servicioId);

		if (error) {
			const msg = encodeURIComponent(
				`Error al actualizar servicio: ${error.message}`,
			);
			return redirect(`${back}?status=error&msg=${msg}`);
		}

		return redirect(
			`${back}?status=success&msg=${encodeURIComponent('Servicio actualizado correctamente')}`,
		);
	} catch (e: any) {
		const msg = encodeURIComponent(`Error inesperado: ${e?.message ?? e}`);
		return redirect(`${back}?status=error&msg=${msg}`);
	}
};
