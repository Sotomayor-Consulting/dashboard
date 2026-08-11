import type { SupabaseClient } from '@supabase/supabase-js';
import {
	DOCUMENT_TYPE_SLUGS,
	getDocumentTypeIdBySlug,
} from '@domains/documents/document-types';

export const PLANNING_MEETING_STAGE_SLUG = 'planning_meeting' as const;

export type PlanningMeetingSubstate =
	'schedule_pending' | 'meeting_scheduled' | 'awaiting_doc' | 'delivered';
// NOTA: los substates 'awaiting_approval' | 'rejected' | 'approved' se
// retiraron al eliminar la aprobación del cliente. El informe ahora solo
// se entrega ('delivered'), no se aprueba.

export interface PlanningDesignDocument {
	id: string;
	file_name: string;
	file_title: string | null;
	bucket_path: string;
	bucket_storage: string;
	version: number;
	uploaded_at: string;
	uploaded_by: string | null;
	mime_type: string | null;
	file_size_bytes: number | null;
	notes: string | null;
}

export interface PlanningMeetingApproval {
	id: string;
	round: number;
	decision: 'approved' | 'rejected' | 'requested_changes';
	comments: string | null;
	decided_at: string;
	decided_by: string | null;
}

export interface PlanningMeetingMeetingMini {
	id: string;
	status: string;
	scheduled_at: string;
	duration_minutes: number;
}

export interface PlanningMeetingContext {
	substate: PlanningMeetingSubstate;
	stageId: string;
	stageStatus: string;
	meeting: PlanningMeetingMeetingMini | null;
	document: PlanningDesignDocument | null;
	latestApproval: PlanningMeetingApproval | null;
	approvalHistory: PlanningMeetingApproval[];
}

const isMeetingPast = (m: PlanningMeetingMeetingMini): boolean => {
	const endsAt =
		new Date(m.scheduled_at).getTime() + m.duration_minutes * 60 * 1000;
	return Date.now() > endsAt;
};

/**
 * Última versión del informe de planificación del caso. La relación
 * documento → caso vive en document_links desde que se eliminó
 * documents.documents.case_id, así que se resuelve en dos pasos.
 */
const fetchLatestPlanningDocument = async (
	supabase: SupabaseClient,
	incorporationId: string,
): Promise<PlanningDesignDocument | null> => {
	const documentsDb = supabase.schema('documents' as never);

	const { data: links } = await documentsDb
		.from('document_links')
		.select('document_id')
		.eq('related_to_type', 'incorporation_case')
		.eq('related_to_id', incorporationId);

	const ids = (links ?? []).map(
		(link: { document_id: string }) => link.document_id,
	);
	if (ids.length === 0) return null;

	const { data } = await documentsDb
		.from('documents')
		.select(
			`id, file_name, file_title, bucket_path, bucket_storage, version,
			uploaded_at, uploaded_by, mime_type, file_size_bytes, notes`,
		)
		.in('id', ids)
		.eq(
			'document_type_id',
			await getDocumentTypeIdBySlug(DOCUMENT_TYPE_SLUGS.planningDesignReport),
		)
		.neq('status', 'archived')
		.order('version', { ascending: false })
		.limit(1)
		.maybeSingle();

	return (data as PlanningDesignDocument | null) ?? null;
};

/**
 * Resolves the planning_meeting sub-state by reading meeting, document and
 * approval data. Used by both client and operations views to render the
 * stage with the correct UI affordances.
 */
export const resolvePlanningMeetingContext = async (
	supabase: SupabaseClient,
	params: { incorporationId: string; stageId: string; stageStatus: string },
): Promise<PlanningMeetingContext> => {
	const { incorporationId, stageId, stageStatus } = params;

	const [meetingResult, document, approvalsResult] = await Promise.all([
		supabase.rpc('get_workflow_meeting', {
			p_incorporation_id: incorporationId,
		}),
		fetchLatestPlanningDocument(supabase, incorporationId),
		supabase
			.schema('workflow' as never)
			.from('approval_records')
			.select('id, round, decision, comments, decided_at, decided_by')
			.eq('workflow_stage_id', stageId)
			.order('round', { ascending: false }),
	]);

	const meetingRaw = meetingResult.data as
		(PlanningMeetingMeetingMini & { found?: boolean }) | null;
	const meeting =
		meetingRaw && meetingRaw.found !== false
			? {
					id: meetingRaw.id,
					status: meetingRaw.status,
					scheduled_at: meetingRaw.scheduled_at,
					duration_minutes: meetingRaw.duration_minutes,
				}
			: null;

	const approvalHistory = (approvalsResult.data ??
		[]) as PlanningMeetingApproval[];
	const latestApproval = approvalHistory[0] ?? null;

	const substate = deriveSubstate({
		stageStatus,
		meeting,
		document,
		latestApproval,
	});

	return {
		substate,
		stageId,
		stageStatus,
		meeting,
		document,
		latestApproval,
		approvalHistory,
	};
};

const deriveSubstate = (input: {
	stageStatus: string;
	meeting: PlanningMeetingMeetingMini | null;
	document: PlanningDesignDocument | null;
	latestApproval: PlanningMeetingApproval | null;
}): PlanningMeetingSubstate => {
	const { stageStatus, meeting, document } = input;

	// La etapa completada o con el informe ya generado/subido → entregado.
	if (stageStatus === 'completed' || document) {
		return 'delivered';
	}

	if (!meeting || meeting.status === 'cancelled') {
		return 'schedule_pending';
	}

	const meetingHappened =
		meeting.status === 'completed' ||
		(meeting.status === 'scheduled' && isMeetingPast(meeting));

	if (!meetingHappened) {
		return 'meeting_scheduled';
	}

	return 'awaiting_doc';
};
