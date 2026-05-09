export const prerender = false;

import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '@infrastructure/supabase';
import { safeBack } from '@infrastructure/security/headers';

const BACK_PATH = '/admin/services/'; // Ajusta esta ruta según tu frontend

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
		const supabase = createSupabaseServerClient({ headers: request.headers, cookies });

		// 2) Verificar que el usuario es admin
		const { data: { user: actor }, error: userErr } = await supabase.auth.getUser();
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
		const servicioId = form.get('servicio_id')?.toString();
		const activoRaw = form.get('servicio_activo')?.toString();

		if (!servicioId) {
			return redirect(
				`${back}?status=error&msg=${encodeURIComponent('Falta el ID del servicio')}`,
			);
		}
		if (activoRaw == null) {
			return redirect(
				`${back}?status=error&msg=${encodeURIComponent('Falta el valor de servicio_activo')}`,
			);
		}

		const servicio_activo = parseBoolean(activoRaw);
		if (servicio_activo === null) {
			return redirect(
				`${back}?status=error&msg=${encodeURIComponent(
					'Valor inválido para servicio_activo (usa true/false, 1/0, on/off)',
				)}`,
			);
		}

		// 4) Preparar payload para actualizar (siguiendo tu patrón)
		const payload: Record<string, any> = {
			servicio_activo,
			// Nota: en tu endpoint base usas created_at como "updated". Replico el patrón:
			created_at: new Date().toISOString(),
			// Si en tu esquema existe updated_at y prefieres usarlo, cambia a:
			// updated_at: new Date().toISOString(),
		};

		// 5) Actualizar el servicio
		const { error } = await supabase
			.from('servicios')
			.update(payload)
			.eq('id', servicioId);

		if (error) {
			const msg = encodeURIComponent(
				`Error al actualizar servicio_activo: ${error.message}`,
			);
			return redirect(`${back}?status=error&msg=${msg}`);
		}

		return redirect(
			`${back}?status=success&msg=${encodeURIComponent(
				`Servicio ${servicio_activo ? 'activado' : 'desactivado'} correctamente`,
			)}`,
		);
	} catch (e: any) {
		const msg = encodeURIComponent(`Error inesperado: ${e?.message ?? e}`);
		return redirect(`${back}?status=error&msg=${msg}`);
	}
};
