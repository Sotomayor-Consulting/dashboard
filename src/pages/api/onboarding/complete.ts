// ─── Onboarding: completar datos de empresa Odoo ────────
// Actualiza la fila de empresas_incorporaciones creada por el flujo
// Odoo con el tipo de negocio, estado y nombres elegidos por el usuario.
export const prerender = false;

import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '@infrastructure/supabase';
import { invalidateLayoutCache } from '@infrastructure/cache/layout-cache';
import { PATHS } from '@infrastructure/auth';

const BACK = PATHS.onboarding;

const back = (msg: string) =>
	`${BACK}?status=error&msg=${encodeURIComponent(msg)}`;

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
	const supabase = createSupabaseServerClient({
		headers: request.headers,
		cookies,
	});

	const {
		data: { user },
		error: authErr,
	} = await supabase.auth.getUser();
	if (authErr || !user) return redirect(PATHS.signIn);

	const form = await request.formData();
	const empresaId = form.get('empresa_incorporacion_id')?.toString() ?? '';
	const tipo = form.get('tipo_de_negocio')?.toString().trim() ?? '';
	const estado = form.get('estado_de_incorporacion')?.toString().trim() ?? '';
	const nombre1 = form.get('nombre_1')?.toString().trim() ?? '';
	const nombre2 = form.get('nombre_2')?.toString().trim() ?? '';
	const nombre3 = form.get('nombre_3')?.toString().trim() ?? '';

	if (!empresaId) return redirect(back('Empresa no especificada.'));
	if (!tipo) return redirect(back('Selecciona el tipo de negocio.'));
	if (!estado) return redirect(back('Selecciona el estado de incorporación.'));
	if (!nombre1) return redirect(back('El nombre principal es obligatorio.'));

	const { error } = await supabase
		.from('empresas_incorporaciones')
		.update({
			tipo_de_negocio: tipo,
			estado_de_incorporacion: estado,
			nombre_1: nombre1,
			nombre_2: nombre2 || null,
			nombre_3: nombre3 || null,
			updated_at: new Date().toISOString(),
		})
		.eq('empresa_incorporacion_id', empresaId)
		.eq('user_id', user.id);

	if (error) return redirect(back(`No se pudo guardar: ${error.message}`));

	invalidateLayoutCache(user.id);

	return redirect(`${PATHS.home}?status=success&msg=${encodeURIComponent('¡Bienvenido! Hemos registrado tu empresa.')}`);
};
