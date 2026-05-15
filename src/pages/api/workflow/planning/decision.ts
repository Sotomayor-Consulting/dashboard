export const prerender = false;

import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '@infrastructure/supabase';
import { supabaseAdmin } from '@infrastructure/supabase/admin';
import { recordApproval, type ApprovalDecision } from '@domains/workflow';
import {
	getClientRecipientForCase,
	getOperationsTeamUserIds,
} from '@domains/workflow/stages/planning-meeting-recipients';
import { notifyByEvent } from '@infrastructure/notifications';
import { SECURITY_HEADERS } from '@infrastructure/security/headers';

const json = (status: number, payload: unknown) =>
	new Response(JSON.stringify(payload), {
		status,
		headers: SECURITY_HEADERS,
	});

const VALID_DECISIONS: ApprovalDecision[] = ['approved', 'rejected'];

interface StageRow {
	id: string;
	workflow_id: string;
	workflow: { incorporation_id: string } | null;
}

export const POST: APIRoute = async ({ request, cookies }) => {
	const supabase = createSupabaseServerClient({
		headers: request.headers,
		cookies,
	});

	const {
		data: { user },
		error: authErr,
	} = await supabase.auth.getUser();
	if (authErr || !user) {
		return json(401, { ok: false, error: 'NO_AUTH_USER' });
	}

	const body = await request.json().catch(() => null);
	const stageId = body?.stageId?.toString().trim();
	const decision = body?.decision?.toString().trim() as ApprovalDecision;
	const commentsRaw = body?.comments?.toString().trim() ?? '';

	if (!stageId) return json(400, { ok: false, error: 'MISSING_STAGE_ID' });
	if (!VALID_DECISIONS.includes(decision)) {
		return json(400, { ok: false, error: 'INVALID_DECISION' });
	}
	if (decision === 'rejected' && !commentsRaw) {
		return json(400, { ok: false, error: 'MISSING_REJECTION_COMMENTS' });
	}

	// Verificar ownership: solo el dueño de la empresa puede aprobar/rechazar
	const { data: stageRaw, error: stageErr } = await supabaseAdmin
		.schema('workflow')
		.from('incorporation_workflow_stages')
		.select(
			`id, workflow_id,
			workflow:workflow_id ( incorporation_id )`,
		)
		.eq('id', stageId)
		.maybeSingle();

	if (stageErr || !stageRaw) {
		return json(404, { ok: false, error: 'STAGE_NOT_FOUND' });
	}

	const stage = stageRaw as unknown as StageRow;
	const incorporationId = stage.workflow?.incorporation_id;
	if (!incorporationId) {
		return json(500, { ok: false, error: 'INCORPORATION_NOT_LINKED' });
	}

	const { data: empresa } = await supabaseAdmin
		.from('empresas_incorporaciones')
		.select('user_id, nombre_1')
		.eq('empresa_incorporacion_id', incorporationId)
		.maybeSingle();

	if (!empresa || empresa.user_id !== user.id) {
		return json(403, { ok: false, error: 'FORBIDDEN' });
	}

	const result = await recordApproval(
		supabase,
		stageId,
		decision,
		commentsRaw || undefined,
		user.id,
	);

	if (!result.ok) {
		return json(400, result);
	}

	// Notificar al equipo de operaciones (best-effort, no bloquea respuesta)
	const opsUserIds = await getOperationsTeamUserIds();
	if (opsUserIds.length > 0) {
		const eventKey =
			decision === 'approved'
				? 'workflow.planning.doc_approved'
				: 'workflow.planning.doc_rejected';
		const recipientClient = await getClientRecipientForCase(incorporationId);
		const companyName =
			recipientClient?.companyName ?? empresa.nombre_1 ?? 'la empresa';

		await notifyByEvent({
			eventKey,
			recipients: opsUserIds.map((userId) => ({ userId })),
			context: {
				company_name: companyName,
				action_url: `/incorporations/${incorporationId}`,
				comments: commentsRaw || '(sin comentarios)',
			},
		}).catch((err) => {
			console.error('[planning/decision] notification error:', err);
		});
	}

	return json(200, { ok: true, result });
};
