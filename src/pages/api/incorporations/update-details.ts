export const prerender = false;

import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '@infrastructure/supabase';
import { canManageCompanyData, extractTokenRoleNames } from '@shared/roles';
import { safeBack } from '@infrastructure/security/headers';

const FALLBACK_BACK = '/incorporations/';

export const POST: APIRoute = async ({ request, cookies, redirect, url }) => {
	const back = safeBack(url.searchParams.get('back'), FALLBACK_BACK);
	const supabase = createSupabaseServerClient({ headers: request.headers, cookies });

	const {
		data: { user },
		error: userErr,
	} = await supabase.auth.getUser();
	const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();

	if (userErr || claimsError || !user || !claimsData?.claims) {
		return redirect(`${back}?status=error&msg=${encodeURIComponent('No autenticado')}`);
	}

	const canEdit = canManageCompanyData(extractTokenRoleNames(claimsData.claims));

	if (!canEdit) {
		return redirect(`${back}?status=error&msg=${encodeURIComponent('No autorizado')}`);
	}

	const form = await request.formData();
	const empresaId =
		form.get('empresa_incorporacion_id')?.toString().trim() ||
		url.searchParams.get('empresa')?.trim() ||
		'';

	if (!empresaId) {
		return redirect(`${back}?status=error&msg=${encodeURIComponent('Empresa inválida')}`);
	}

	const payload: Record<string, string | number | boolean | null> = {
		nombre_1:
			form.get('name_option_1')?.toString().trim() ||
			form.get('nombre_1')?.toString().trim() ||
			null,
		nombre_2:
			form.get('name_option_2')?.toString().trim() ||
			form.get('nombre_2')?.toString().trim() ||
			null,
		nombre_3:
			form.get('name_option_3')?.toString().trim() ||
			form.get('nombre_3')?.toString().trim() ||
			null,
		tipo_de_negocio:
			form.get('business_type')?.toString().trim() ||
			form.get('tipo_de_negocio')?.toString().trim() ||
			null,
		estado:
			form.get('incorporation_status')?.toString().trim() ||
			form.get('estado')?.toString().trim() ||
			null,
		descripcion_empresa:
			form.get('activity_description')?.toString().trim() || null,
		activity_description:
			form.get('activity_description')?.toString().trim() || null,
		forma_administracion:
			form.get('forma_administracion')?.toString().trim() || null,
		forma_tributacion: form.get('forma_tributacion')?.toString().trim() || null,
		direccion_operativa_eeuu:
			form.get('direccion_operativa_eeuu')?.toString().trim() || null,
		Pais_operativo: form.get('Pais_operativo')?.toString().trim() || null,
		direccion_eeuu: form.get('direccion_eeuu')?.toString().trim() || null,
		ciudad_eeuu: form.get('ciudad_eeuu')?.toString().trim() || null,
		codigo_postal_eeuu:
			form.get('codigo_postal_eeuu')?.toString().trim() || null,
		Obtendra_ingresos_desde_eeuu:
			form.get('obtendra_ingresos_desde_eeuu') !== null,
		updated_at: new Date().toISOString(),
	};

	const activityIdRaw = form.get('activity_id')?.toString().trim() || '';
	const estadoIdRaw = form.get('state_id')?.toString().trim() || '';

	payload.activity_id = activityIdRaw ? Number(activityIdRaw) : null;
	payload.estado_id = estadoIdRaw ? Number(estadoIdRaw) : null;
	payload.state_id = estadoIdRaw ? Number(estadoIdRaw) : null;

	const { error } = await supabase
		.from('empresas_incorporaciones')
		.update(payload)
		.eq('empresa_incorporacion_id', empresaId);

	if (error) {
		return redirect(
			`${back}?status=error&msg=${encodeURIComponent(`DB: ${error.message}`)}`,
		);
	}

	return redirect(
		`${back}?status=success&msg=${encodeURIComponent('Detalles actualizados')}`,
	);
};
