export const prerender = false;

import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '@infrastructure/supabase';
import { resolveDocumentActor, DocumentsError } from '@domains/documents';
import {
	generateAndUploadReport,
	completePlanningTaskByTitle,
	PLANNING_TASK_FILL,
	PLANNING_TASK_SCHEDULE,
} from '@domains/workflow/stages/planning-design-report';
import { getClientRecipientForCase } from '@domains/workflow/stages/planning-meeting-recipients';
import { notifyByEvent } from '@infrastructure/notifications';
import { SECURITY_HEADERS } from '@infrastructure/security/headers';
import { createLogger } from '@infrastructure/logging';

const log = createLogger('planning.generate-report');

const json = (status: number, payload: unknown) =>
	new Response(JSON.stringify(payload), { status, headers: SECURITY_HEADERS });

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

	const actor = await resolveDocumentActor(supabase, locals.userRoles ?? []);
	if (!actor.isStaff) {
		return json(403, { ok: false, error: 'FORBIDDEN' });
	}

	const body = await request.json().catch(() => null);
	const incorporationId = (body?.incorporationId as string | null)?.trim();
	if (!incorporationId) {
		return json(400, { ok: false, error: 'MISSING_INCORPORATION_ID' });
	}

	try {
		const result = await generateAndUploadReport(actor, incorporationId);

		// "Agendar reunión" pudo quedar pendiente; al enviar el informe la
		// reunión ya ocurrió. Se completa para no bloquear el auto-avance.
		await completePlanningTaskByTitle(
			incorporationId,
			PLANNING_TASK_SCHEDULE,
			user.id,
		);

		// Completa "Llenar informe" → con todas las tareas hechas la etapa
		// (auto_advance) se completa y avanza sola.
		const completed = await completePlanningTaskByTitle(
			incorporationId,
			PLANNING_TASK_FILL,
			user.id,
		);

		// Notifica al cliente que su informe está disponible (best-effort).
		const client = await getClientRecipientForCase(incorporationId);
		if (client) {
			await notifyByEvent({
				eventKey: 'workflow.planning.doc_uploaded',
				recipients: [{ userId: client.userId }],
				context: {
					company_name: client.companyName ?? 'tu empresa',
					action_url: `/my-companies/${incorporationId}/dashboard`,
				},
			}).catch((err) => {
				log.error('notification error', { error: err });
			});
		}

		return json(200, {
			ok: true,
			documentId: result.documentId,
			version: result.version,
			taskCompleted: completed,
		});
	} catch (error) {
		if (error instanceof DocumentsError) {
			return json(error.status, { ok: false, error: error.message });
		}
		log.error('Unexpected error', {
			message: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined,
		});
		return json(500, { ok: false, error: 'UNEXPECTED_ERROR' });
	}
};
