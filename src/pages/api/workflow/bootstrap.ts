import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '@lib/supabase';
import { createWorkflowForIncorporation } from '@lib/tables/workflow';
import { SECURITY_HEADERS } from '@lib/security/headers';

export const prerender = false;

const json = (status: number, payload: unknown) =>
	new Response(JSON.stringify(payload), {
		status,
		headers: SECURITY_HEADERS,
	});

export const POST: APIRoute = async ({ request, cookies, locals }) => {
	const userRoles = locals.userRoles || [];
	const canBootstrap = userRoles.includes('admin') || userRoles.includes('operaciones');
	if (!canBootstrap) {
		return json(403, { ok: false, error: 'FORBIDDEN' });
	}

	const supabase = createSupabaseServerClient({
		headers: request.headers,
		cookies,
	});

	const {
		data: { user },
		error: authError,
	} = await supabase.auth.getUser();
	if (authError || !user) {
		return json(401, { ok: false, error: 'NO_AUTH_USER' });
	}

	const body = await request.json().catch(() => null);
	const incorporationId = body?.incorporationId?.toString().trim();
	const planId = Number(body?.planId);

	if (!incorporationId) {
		return json(400, { ok: false, error: 'MISSING_INCORPORATION_ID' });
	}

	if (!Number.isInteger(planId) || planId <= 0) {
		return json(400, { ok: false, error: 'INVALID_PLAN_ID' });
	}

	const workflowId = await createWorkflowForIncorporation(
		supabase,
		incorporationId,
		planId,
	);

	if (!workflowId) {
		return json(400, {
			ok: false,
			error: 'WORKFLOW_NOT_CREATED',
			detail: 'No existe applicability para el plan o ya hay workflow creado.',
		});
	}

	return json(200, { ok: true, workflowId });
};
