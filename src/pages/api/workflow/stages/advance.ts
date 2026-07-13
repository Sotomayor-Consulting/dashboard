import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '@infrastructure/supabase';
import { advanceStage, getWorkflowIdByIncorporation } from '@domains/workflow';
import { SECURITY_HEADERS } from '@infrastructure/security/headers';

export const prerender = false;

const json = (status: number, payload: unknown) =>
	new Response(JSON.stringify(payload), {
		status,
		headers: SECURITY_HEADERS,
	});

export const POST: APIRoute = async ({ request, cookies, locals }) => {
	const userRoles = locals.userRoles || [];
	const canAdvance =
		userRoles.includes('admin') || userRoles.includes('operaciones');
	if (!canAdvance) {
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
	if (!incorporationId) {
		return json(400, { ok: false, error: 'MISSING_INCORPORATION_ID' });
	}

	const workflowId = await getWorkflowIdByIncorporation(
		supabase,
		incorporationId,
	);
	if (!workflowId) {
		return json(404, { ok: false, error: 'WORKFLOW_NOT_FOUND' });
	}

	const result = await advanceStage(supabase, workflowId);
	if (!result.ok) {
		return json(400, result);
	}

	return json(200, {
		ok: true,
		currentStageId: result.current_stage_id,
		workflowCompleted: result.workflow_completed,
	});
};
