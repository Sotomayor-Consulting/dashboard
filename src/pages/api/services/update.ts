export const prerender = false;

import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '@infrastructure/supabase';
import { supabaseAdmin } from '@infrastructure/supabase/admin';
import { safeBack } from '@infrastructure/security/headers';

const BACK_PATH = '/admin/services/'; // Ajusta esta ruta según tu frontend

export const POST: APIRoute = async ({ request, cookies, redirect, url }) => {
	const back = safeBack(url.searchParams.get('back'), BACK_PATH);

	try {
		// 1) Sesión
		const supabase = createSupabaseServerClient({
			headers: request.headers,
			cookies,
		});

		// 2) Verificar que el usuario es admin
		const {
			data: { user: actor },
			error: userErr,
		} = await supabase.auth.getUser();
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

		// 4) Preparar payload para actualizar (catálogo canónico)
		const payload: Record<string, any> = {
			updated_at: new Date().toISOString(),
		};

		// Solo agregar campos si tienen valor
		if (nombre) payload.name = nombre;
		if (precioRaw) {
			const precio = Number(precioRaw);
			if (!Number.isNaN(precio)) payload.price = precio;
		}
		if (categoria) payload.metadata = { categoria };
		if (descripcion) payload.description = descripcion;

		// Verificar que hay campos para actualizar
		if (Object.keys(payload).length === 1) {
			// Solo tiene updated_at
			return redirect(
				`${back}?status=success&msg=${encodeURIComponent('Sin cambios')}`,
			);
		}

		// 5) Actualizar el plan (supabaseAdmin: la vista es solo-SELECT para authenticated)
		const { error } = await supabaseAdmin
			.schema('catalogs')
			.from('service_plans')
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
