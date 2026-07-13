import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '@infrastructure/supabase';
import { recordApproval, type ApprovalDecision } from '@domains/workflow';
import { SECURITY_HEADERS } from '@infrastructure/security/headers';

export const prerender = false;

const json = (status: number, payload: unknown) =>
	new Response(JSON.stringify(payload), {
		status,
		headers: SECURITY_HEADERS,
	});

const VALID_DECISIONS: ApprovalDecision[] = [
	'approved',
	'rejected',
	'requested_changes',
];

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
	const stageId = body?.stageId?.toString().trim();
	const decision = body?.decision?.toString().trim() as ApprovalDecision;
	const comments = body?.comments?.toString().trim();

	if (!stageId) {
		return json(400, { ok: false, error: 'MISSING_STAGE_ID' });
	}

	if (!VALID_DECISIONS.includes(decision)) {
		return json(400, {
			ok: false,
			error: 'INVALID_DECISION',
			valid: VALID_DECISIONS,
		});
	}

	const result = await recordApproval(
		supabase,
		stageId,
		decision,
		comments,
		user.id,
	);

	if (!result.ok) {
		return json(400, result);
	}

	return json(200, { ok: true, result });
};
