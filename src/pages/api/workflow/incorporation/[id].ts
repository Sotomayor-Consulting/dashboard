import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '@infrastructure/supabase';
import {
	getWorkflowByIncorporation,
	listStages,
	listTasksByIncorporation,
} from '@domains/workflow';
import { SECURITY_HEADERS } from '@infrastructure/security/headers';

export const prerender = false;

const json = (status: number, payload: unknown) =>
	new Response(JSON.stringify(payload), {
		status,
		headers: SECURITY_HEADERS,
	});

export const GET: APIRoute = async ({ params, request, cookies }) => {
	const incorporationId = params.id;
	if (!incorporationId) {
		return json(400, { ok: false, error: 'MISSING_INCORPORATION_ID' });
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

	const workflow = await getWorkflowByIncorporation(supabase, incorporationId);
	if (!workflow) {
		return json(404, { ok: false, error: 'WORKFLOW_NOT_FOUND' });
	}

	const [stages, tasks] = await Promise.all([
		listStages(supabase, workflow.id),
		listTasksByIncorporation(supabase, incorporationId),
	]);

	return json(200, {
		ok: true,
		workflow,
		stages,
		tasks,
	});
};
