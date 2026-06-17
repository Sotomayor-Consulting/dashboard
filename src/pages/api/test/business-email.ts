export const prerender = false;

import type { APIRoute } from 'astro';
import {
	sendDocumentRequestedEmail,
	sendDocumentSharedEmail,
	sendIncorporationSubmittedEmail,
	sendIncorporationValidatedEmail,
	sendWorkflowTaskCompletedEmail,
} from '@infrastructure/email/bussiness-events';
import { createSupabaseServerClient } from '@infrastructure/supabase';
import { SECURITY_HEADERS } from '@infrastructure/security/headers';

type TestEventKey =
	| 'workflow.task.completed'
	| 'documents.requested'
	| 'documents.shared'
	| 'incorporation.submitted'
	| 'incorporation.validated';

const ALLOWED_EVENTS = new Set<TestEventKey>([
	'workflow.task.completed',
	'documents.requested',
	'documents.shared',
	'incorporation.submitted',
	'incorporation.validated',
]);

const json = (status: number, payload: unknown) =>
	new Response(JSON.stringify(payload), {
		status,
		headers: {
			...SECURITY_HEADERS,
			'Content-Type': 'application/json',
		},
	});

const asText = (value: unknown): string | null => {
	if (typeof value !== 'string') return null;
	const trimmed = value.trim();
	return trimmed || null;
};

export const POST: APIRoute = async ({ request, cookies, locals }) => {
	if (!import.meta.env.DEV) {
		return json(404, { ok: false, error: 'NOT_FOUND' });
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

	const userRoles = locals.userRoles ?? [];
	if (!userRoles.includes('admin')) {
		return json(403, { ok: false, error: 'FORBIDDEN' });
	}

	const body = await request.json().catch(() => null);
	const eventKey = asText(body?.eventKey) as TestEventKey | null;
	const caseId = asText(body?.caseId);
	const actionUrl = asText(body?.actionUrl);
	const taskId = asText(body?.taskId);
	const message = asText(body?.message);
	const dueDate = asText(body?.dueDate);
	const clientEmailOverride = asText(body?.clientEmailOverride);

	if (!eventKey || !ALLOWED_EVENTS.has(eventKey)) {
		return json(400, { ok: false, error: 'INVALID_EVENT_KEY' });
	}

	try {
		if (eventKey === 'workflow.task.completed') {
			if (!taskId) {
				return json(400, { ok: false, error: 'MISSING_TASK_ID' });
			}

			const result = await sendWorkflowTaskCompletedEmail(
				taskId,
				actionUrl,
				clientEmailOverride,
			);
			return json(200, { ok: true, eventKey, result });
		}

		if (!caseId) {
			return json(400, { ok: false, error: 'MISSING_CASE_ID' });
		}

		if (eventKey === 'documents.requested') {
			const result = await sendDocumentRequestedEmail({
				caseId,
				actionUrl,
				message,
				dueDate,
				clientEmailOverride,
			});
			return json(200, { ok: true, eventKey, result });
		}

		if (eventKey === 'documents.shared') {
			const result = await sendDocumentSharedEmail({
				caseId,
				actionUrl,
				clientEmailOverride,
			});
			return json(200, { ok: true, eventKey, result });
		}

		if (eventKey === 'incorporation.submitted') {
			const result = await sendIncorporationSubmittedEmail({
				caseId,
				actionUrl,
				clientEmailOverride,
			});
			return json(200, { ok: true, eventKey, result });
		}

		const result = await sendIncorporationValidatedEmail({
			caseId,
			actionUrl,
			clientEmailOverride,
		});

		return json(200, { ok: true, eventKey, result });
	} catch (error) {
		console.error('[test/business-email] failed', error);
		return json(500, {
			ok: false,
			error: error instanceof Error ? error.message : 'UNEXPECTED_ERROR',
		});
	}
};
