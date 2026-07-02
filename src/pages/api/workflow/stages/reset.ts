export const prerender = false;

import type { APIRoute } from 'astro';
import { supabaseAdmin } from '@infrastructure/supabase/admin';
import { createSupabaseServerClient } from '@infrastructure/supabase';
import { SECURITY_HEADERS } from '@infrastructure/security/headers';
import { hasAnyRole, ROLE_GROUPS } from '@shared/roles';
import { createLogger } from '@infrastructure/logging';

const log = createLogger('workflow.stages.reset');

const json = (status: number, payload: unknown) =>
	new Response(JSON.stringify(payload), {
		status,
		headers: SECURITY_HEADERS,
	});

export const POST: APIRoute = async ({ request, cookies, locals }) => {
	const supabase = createSupabaseServerClient({
		headers: request.headers,
		cookies,
	});

	const {
		data: { user },
		error: authError,
	} = await supabase.auth.getUser();
	if (authError || !user) {
		return json(401, { ok: false, error: 'No autenticado' });
	}

	const userRoles = locals.userRoles ?? [];
	if (!hasAnyRole(userRoles, ROLE_GROUPS.INCORPORATION_ROUTE)) {
		return json(403, { ok: false, error: 'Sin permisos' });
	}

	let body: { stage_id?: string };
	try {
		body = await request.json();
	} catch {
		return json(400, { ok: false, error: 'Body inválido' });
	}

	const stageId = body.stage_id;
	if (!stageId) {
		return json(400, { ok: false, error: 'stage_id es requerido' });
	}

	const { data, error } = await supabaseAdmin.schema('workflow' as never).rpc(
		'reset_stage',
		{
			p_stage_id: stageId,
			p_reset_by: user.id,
		},
	);

	if (error) {
		log.error('RPC error', { error, stageId });
		return json(500, { ok: false, error: 'Error al resetear etapa' });
	}

	const result = data as { success: boolean; error?: string };
	if (!result.success) {
		return json(404, { ok: false, error: result.error });
	}

	log.info('Stage reset', { stageId, userId: user.id, result });
	return json(200, { ok: true, ...result });
};
