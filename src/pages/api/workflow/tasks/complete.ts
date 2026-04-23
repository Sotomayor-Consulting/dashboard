import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '@lib/supabase';
import { completeTask } from '@lib/tablas/workflow';
import { SECURITY_HEADERS } from '@lib/security/headers';

export const prerender = false;

const json = (status: number, payload: unknown) =>
	new Response(JSON.stringify(payload), {
		status,
		headers: SECURITY_HEADERS,
	});

export const POST: APIRoute = async ({ request, cookies }) => {
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
	const taskId = body?.taskId?.toString().trim();
	if (!taskId) {
		return json(400, { ok: false, error: 'MISSING_TASK_ID' });
	}

	const result = await completeTask(supabase, taskId, user.id);
	if (!result.ok) {
		return json(400, result);
	}

	return json(200, { ok: true, result });
};
