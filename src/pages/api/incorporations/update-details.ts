export const prerender = false;

import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '@infrastructure/supabase';
import { canManageCompanyData, extractTokenRoleNames } from '@shared/roles';
import { safeBack } from '@infrastructure/security/headers';
import { updateIncorporationDetails } from '@domains/companies/incorporation-details';

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
	console.log(form);
	const empresaId =
		form.get('empresa_incorporacion_id')?.toString().trim() ||
		url.searchParams.get('empresa')?.trim() ||
		'';

	if (!empresaId) {
		return redirect(`${back}?status=error&msg=${encodeURIComponent('Empresa inválida')}`);
	}

	const payload = {
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
	};

	const estadoIdRaw = form.get('state_id')?.toString().trim() || '';
	const stateId = estadoIdRaw ? Number(estadoIdRaw) : null;

	try {
		await updateIncorporationDetails(
			supabase,
			empresaId,
			{ ...payload, state_id: Number.isFinite(stateId) ? stateId : null },
			user.id,
		);
	} catch (error) {
		return redirect(
			`${back}?status=error&msg=${encodeURIComponent(
				error instanceof Error ? error.message : 'Error inesperado',
			)}`,
		);
	}

	return redirect(
		`${back}?status=success&msg=${encodeURIComponent('Detalles actualizados')}`,
	);
};
