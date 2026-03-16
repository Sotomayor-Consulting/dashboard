// src/pages/api/admin/usuarios/update.ts
export const prerender = false;

import type { APIRoute } from 'astro';
// Ajusta esta ruta si tu estructura es distinta:
import { createSupabaseServerClient } from '@lib/supabase';

const BACK_PATH = '/crud/users';

export const POST: APIRoute = async ({ request, cookies, redirect, url }) => {
	const back = url.searchParams.get('back') || BACK_PATH;

	try {
		// 1) Sesión
		const supabase = createSupabaseServerClient({
			headers: request.headers,
			cookies,
		});

		// 2) Actor + verificar admin desde user_roles
		const { data: userRes, error: userErr } = await supabase.auth.getUser();
		const actor = userRes?.user;
		if (userErr || !actor) {
			return redirect(
				`${back}?status=error&msg=${encodeURIComponent('No autenticado')}`,
			);
		}

		// Obtener roles del actor
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

		// 3) Form data
		const form = await request.formData();
		const targetUserId = form.get('user_id')?.toString();
		if (!targetUserId) {
			return redirect(
				`${back}?status=error&msg=${encodeURIComponent('Falta user_id de destino')}`,
			);
		}

		// Campos opcionales (solo actualizamos si llegan con valor no vacío)
		const nombre = form.get('nombre')?.toString().trim();
		const apellido = form.get('apellido')?.toString().trim();
		const correo = form.get('correo')?.toString().trim();
		const organizacion = form.get('compania')?.toString().trim();
		const estado = form.get('estado')?.toString().trim();
		const pais = form.get('pais_modal')?.toString().trim();
		const ciudad = form.get('ciudad_modal')?.toString().trim();
		const direccion_linea1 = form.get('direccion_linea1')?.toString().trim();
		const direccion_linea2 = form.get('direccion_linea2')?.toString().trim();
		const modal_telefono = form.get('modal_telefono')?.toString().trim();
		const fecha_nacimiento = form.get('fecha_nacimiento')?.toString().trim();
		const tipo_identificacion = form
			.get('tipo_identificacion')
			?.toString()
			.trim();
		const numero_de_identificacion = form
			.get('numero_de_identificacion')
			?.toString()
			.trim();
		const tipo_persona = form.get('tipo_persona')?.toString().trim();

		// 4) Build payload (no sobrescribe con strings vacíos)
		const payload: Record<string, any> = {};

		if (nombre) payload.nombre = nombre;
		if (apellido) payload.apellido = apellido;
		if (correo) payload.correo = correo;
		if (organizacion) payload.organizacion = organizacion;
		if (estado) payload.estado = estado;
		if (pais) payload.pais_id = pais;
		if (ciudad) payload.ciudad = ciudad;
		if (direccion_linea1) payload.direccion_linea1 = direccion_linea1;
		if (direccion_linea2) payload.direccion_linea2 = direccion_linea2;
		if (modal_telefono) payload.telf = modal_telefono;
		if (fecha_nacimiento) payload.fecha_nacimiento = fecha_nacimiento;
		if (tipo_identificacion) payload.tipo_identificacion = tipo_identificacion;
		if (numero_de_identificacion)
			payload.numero_de_identificacion = numero_de_identificacion;
		if (tipo_persona) payload.tipo_persona = tipo_persona;

		// (Opcional) marca de tiempo
		// payload.updated_at = new Date().toISOString();

		// Roles desde checkboxes (soporta UUID o número)
		const rolesRaw = form.getAll('roles[]');
		const roles = rolesRaw
			.map((r) => r.toString().trim())
			.filter((r) => r !== '');

		// Si no hay cambios en payload ni roles, salir
		if (Object.keys(payload).length === 0 && roles.length === 0) {
			return redirect(
				`${back}?status=success&msg=${encodeURIComponent('Sin cambios')}`,
			);
		}

		// 5) Update por user_id
		if (Object.keys(payload).length > 0) {
			const { error } = await supabase
				.from('usuarios')
				.update(payload)
				.eq('user_id', targetUserId);

			if (error) {
				const msg = encodeURIComponent(`DB: ${error.message}`);
				return redirect(`${back}?status=error&msg=${msg}`);
			}
		}

		// Insertar roles en user_roles
		if (roles.length > 0) {
			// Eliminar roles existentes del usuario
			await supabase.from('user_roles').delete().eq('user_id', targetUserId);

			// Insertar los nuevos roles
			const rolesToInsert = roles.map((rolId) => ({
				user_id: targetUserId,
				rol_id: rolId, // UUID o número según la tabla roles
			}));

			const { error: rolesError } = await supabase
				.from('user_roles')
				.insert(rolesToInsert);

			if (rolesError) {
				const msg = encodeURIComponent(`DB roles: ${rolesError.message}`);
				return redirect(`${back}?status=error&msg=${msg}`);
			}
		}

		return redirect(
			`${back}?status=success&msg=${encodeURIComponent('Usuario actualizado')}`,
		);
	} catch (e: any) {
		const msg = encodeURIComponent(`Error inesperado: ${e?.message ?? e}`);
		return redirect(`${back}?status=error&msg=${msg}`);
	}
};
