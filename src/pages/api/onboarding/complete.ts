// ─── Onboarding: completar datos de empresa Odoo ────────
// Actualiza la fila de incorporations creada por el flujo
// Odoo con el tipo de negocio, estado y nombres elegidos por el usuario.
export const prerender = false;

import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '@infrastructure/supabase';
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

	let formationStateId: number | null = null;
	if (estado) {
		const { data: stateRow } = await supabase
			.from('states')
			.select('id')
			.ilike('name', estado)
			.limit(1)
			.maybeSingle();
		formationStateId = stateRow?.id ?? null;
	}

	const { error } = await supabase
		.from('incorporations')
		.update({
			entity_type: tipo,
			principal_name: nombre1,
			possible_names: [
				...new Set([nombre1, nombre2, nombre3].filter(Boolean)),
			],
			formation_state_id: formationStateId,
			updated_at: new Date().toISOString(),
		})
		.eq('id', empresaId)
		.eq('user_id', user.id);

	if (error) return redirect(back(`No se pudo guardar: ${error.message}`));

	return redirect(`${PATHS.home}?status=success&msg=${encodeURIComponent('¡Bienvenido! Hemos registrado tu empresa.')}`);
};
