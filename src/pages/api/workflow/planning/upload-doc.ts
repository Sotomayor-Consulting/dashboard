export const prerender = false;

import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '@infrastructure/supabase';
import {
	DocumentsError,
	resolveDocumentActor,
} from '@domains/documents';
import { uploadPlanningDocument } from '@domains/workflow/stages/planning-meeting-upload';
import { getClientRecipientForCase } from '@domains/workflow/stages/planning-meeting-recipients';
import { notifyByEvent } from '@infrastructure/notifications';
import { SECURITY_HEADERS } from '@infrastructure/security/headers';
import { createLogger } from '@infrastructure/logging';

const log = createLogger('planning.upload-doc');

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
		return json(401, { ok: false, error: 'NO_AUTH_USER' });
	}

	const userRoles = locals.userRoles ?? [];
	const actor = await resolveDocumentActor(supabase, userRoles);

	if (!actor.isStaff) {
		return json(403, { ok: false, error: 'FORBIDDEN' });
	}

	const form = await request.formData().catch(() => null);
	if (!form) {
		return json(400, { ok: false, error: 'INVALID_FORM_DATA' });
	}

	const caseId = (form.get('caseId') as string | null)?.trim();
	const file = form.get('file');
	const notesRaw = form.get('notes');
	const notes =
		typeof notesRaw === 'string' && notesRaw.trim() ? notesRaw.trim() : null;

	if (!caseId) {
		return json(400, { ok: false, error: 'MISSING_CASE_ID' });
	}

	if (!(file instanceof File)) {
		return json(400, { ok: false, error: 'MISSING_FILE' });
	}

	try {
		const result = await uploadPlanningDocument(actor, {
			caseId,
			file,
			notes,
		});

		const client = await getClientRecipientForCase(caseId);
		if (client) {
			await notifyByEvent({
				eventKey: 'workflow.planning.doc_uploaded',
				recipients: [{ userId: client.userId }],
				context: {
					company_name: client.companyName ?? 'tu empresa',
					action_url: `/my-companies/${caseId}/dashboard`,
				},
			}).catch((err) => {
				log.error('notification error', { error: err });
			});
		}

		return json(200, {
			ok: true,
			documentId: result.documentId,
			version: result.version,
			documentGroupId: result.documentGroupId,
			replacedDocumentId: result.replacedDocumentId,
		});
	} catch (error) {
		if (error instanceof DocumentsError) {
			return json(error.status, { ok: false, error: error.message });
		}
		log.error('Unexpected error', { error });
		return json(500, { ok: false, error: 'UNEXPECTED_ERROR' });
	}
};
