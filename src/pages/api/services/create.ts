// src/pages/api/admin/servicios/create.ts
export const prerender = false;

import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '@infrastructure/supabase';
import { safeBack } from '@infrastructure/security/headers';

const BACK_PATH = '/admin/servicios/'; // Ajusta esta ruta según tu frontend

export const POST: APIRoute = async ({ request, cookies, redirect, url }) => {
	const back = safeBack(url.searchParams.get('back'), BACK_PATH);

	try {
		// 1) Cliente per-request con contexto de cookies
		const supabase = createSupabaseServerClient({ headers: request.headers, cookies });

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

		const { data: actorRolesData } = await supabase
			.from('user_roles')
			.select('roles(name)')
			.eq('user_id', actor.id);

		const actorRoles: string[] =
			(actorRolesData as any[])
				?.map((ur: any) => ur.roles?.name)
				.filter(Boolean) || [];

		if (!actorRoles.includes('admin')) {
			return redirect(
				`${back}?status=error&msg=${encodeURIComponent('No autorizado')}`,
			);
		}

		// 3) Obtener datos del formulario
		const form = await request.formData();

		// Campos obligatorios
		const nombre = form.get('nombre-service')?.toString().trim();
		const precioRaw = form.get('precio-servicio')?.toString().trim();
		const categoria = form.get('categoria-service')?.toString().trim();
		const descripcion = form.get('descripcion-service')?.toString().trim();

		// Validar campos obligatorios
		if (!nombre) {
			return redirect(
				`${back}?status=error&msg=${encodeURIComponent('Falta el nombre del servicio')}`,
			);
		}
		if (!precioRaw) {
			return redirect(
				`${back}?status=error&msg=${encodeURIComponent('Falta el precio del servicio')}`,
			);
		}
		if (!categoria) {
			return redirect(
				`${back}?status=error&msg=${encodeURIComponent('Falta la categoría del servicio')}`,
			);
		}
		if (!descripcion) {
			return redirect(
				`${back}?status=error&msg=${encodeURIComponent('Falta la descripción del servicio')}`,
			);
		}

		// Validar precio
		const precio = Number(precioRaw);
		if (Number.isNaN(precio)) {
			return redirect(
				`${back}?status=error&msg=${encodeURIComponent('El precio debe ser un número válido')}`,
			);
		}

		// 4) Preparar payload para INSERTAR
		const payload: Record<string, any> = {
			nombre: nombre,
			precio: precio,
			categoria: categoria,
			servicio_activo: true,
			descripcion: descripcion,
			created_at: new Date().toISOString(),
		};

		// 5) INSERTAR el nuevo servicio
		const { error } = await supabase
			.from('servicios')
			.insert(payload)
			.select();

		if (error) {
			const msg = encodeURIComponent(
				`Error al crear servicio: ${error.message}`,
			);
			return redirect(`${back}?status=error&msg=${msg}`);
		}

		return redirect(
			`${back}?status=success&msg=${encodeURIComponent('Servicio creado correctamente')}`,
		);
	} catch (e: any) {
		const msg = encodeURIComponent(`Error inesperado: ${e?.message ?? e}`);
		return redirect(`${back}?status=error&msg=${msg}`);
	}
};
