export const prerender = false;

import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '@infrastructure/supabase';
import { supabaseAdmin } from '@infrastructure/supabase/admin';
import { safeBack } from '@infrastructure/security/headers';

const BACK_PATH = '/admin/services/';

// Helper: parsea a boolean desde strings comunes de formularios
function parseBoolean(input: unknown): boolean | null {
	if (typeof input !== 'string') return null;
	const v = input.trim().toLowerCase();
	if (['true', '1', 'on', 'yes', 'si', 'sí'].includes(v)) return true;
	if (['false', '0', 'off', 'no'].includes(v)) return false;
	return null;
}

export const POST: APIRoute = async ({ request, cookies, redirect, url }) => {
	const back = safeBack(url.searchParams.get('back'), BACK_PATH);

	try {
		// 1) Sesión
		const supabase = createSupabaseServerClient({
			headers: request.headers,
			cookies,
		});

		// 2) Verificar admin
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

		// 3) Datos del form
		const form = await request.formData();
		const servicioId = form.get('des_servicio_id')?.toString();
		// En este menú el input viene con value="true"
		const activoRaw = form.get('des_servicio_activo')?.toString();

		if (!servicioId) {
			return redirect(
				`${back}?status=error&msg=${encodeURIComponent('Falta el ID del servicio')}`,
			);
		}

		// 4) Determinar valor final: si viene válido, úsalo; de lo contrario, fuerza TRUE
		const parsed = activoRaw != null ? parseBoolean(activoRaw) : null;
		const servicio_activo = parsed === null ? true : parsed; // fuerza TRUE si no se puede parsear

		// 5) Actualizar el plan canónico (supabaseAdmin: vista solo-SELECT para authenticated)
		const { error } = await supabaseAdmin
			.schema('catalogs')
			.from('service_plans')
			.update({
				is_active: servicio_activo,
				updated_at: new Date().toISOString(),
			})
			.eq('id', servicioId);

		if (error) {
			const msg = encodeURIComponent(
				`Error al reactivar servicio: ${error.message}`,
			);
			return redirect(`${back}?status=error&msg=${msg}`);
		}

		return redirect(
			`${back}?status=success&msg=${encodeURIComponent('Servicio desarchivado / activado correctamente')}`,
		);
	} catch (e: any) {
		const msg = encodeURIComponent(`Error inesperado: ${e?.message ?? e}`);
		return redirect(`${back}?status=error&msg=${msg}`);
	}
};
