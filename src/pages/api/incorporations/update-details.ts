export const prerender = false;

import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '@infrastructure/supabase';
import { canManageCompanyData, extractTokenRoleNames } from '@shared/roles';
import { updateIncorporationDetails } from '@domains/companies/incorporation-details';
import { updateIncorporationDetailsRequestSchema } from '@modules/companies/islands/company-details/schemas/incorporation-registration.schema';

const json = (status: number, payload: unknown) =>
	new Response(JSON.stringify(payload), {
		status,
		headers: { 'Content-Type': 'application/json' },
	});

export const POST: APIRoute = async ({ request, cookies }) => {
	const supabase = createSupabaseServerClient({
		headers: request.headers,
		cookies,
	});

	const {
		data: { user },
		error: userErr,
	} = await supabase.auth.getUser();
	const { data: claimsData, error: claimsError } =
		await supabase.auth.getClaims();

	if (userErr || claimsError || !user || !claimsData?.claims) {
		return json(401, { ok: false, error: 'No autenticado' });
	}

	const canEdit = canManageCompanyData(
		extractTokenRoleNames(claimsData.claims),
	);

	if (!canEdit) {
		return json(403, { ok: false, error: 'No autorizado' });
	}

	const body = await request.json().catch(() => null);
	const parsed = updateIncorporationDetailsRequestSchema.safeParse(body);

	if (!parsed.success) {
		return json(400, { ok: false, error: 'Datos inválidos' });
	}

	const { empresa_incorporacion_id: empresaId, ...payload } = parsed.data;

	try {
		await updateIncorporationDetails(
			supabase,
			empresaId,
			{
				principal_name: payload.name_option_1,
				possible_names: [
					payload.name_option_1,
					payload.name_option_2,
					payload.name_option_3,
				],
				tipo_de_negocio: payload.business_type,
				state_id: payload.state_id,
			},
			user.id,
		);
	} catch (error) {
		return json(500, {
			ok: false,
			error: error instanceof Error ? error.message : 'Error inesperado',
		});
	}

	return json(200, { ok: true, message: 'Detalles actualizados' });
};
