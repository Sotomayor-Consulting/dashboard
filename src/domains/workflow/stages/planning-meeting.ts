import type { SupabaseClient } from '@supabase/supabase-js';

export const PLANNING_DESIGN_DOC_TYPE_ID = 5;
export const PLANNING_MEETING_STAGE_SLUG = 'planning_meeting' as const;

export type PlanningMeetingSubstate =
	| 'schedule_pending'
	| 'meeting_scheduled'
	| 'awaiting_doc'
	| 'awaiting_approval'
	| 'rejected'
	| 'approved';

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
 * Resolves the planning_meeting sub-state by reading meeting, document and
 * approval data. Used by both client and operations views to render the
 * stage with the correct UI affordances.
 */
export const resolvePlanningMeetingContext = async (
	supabase: SupabaseClient,
	params: { incorporationId: string; stageId: string; stageStatus: string },
): Promise<PlanningMeetingContext> => {
	const { incorporationId, stageId, stageStatus } = params;

	const [meetingResult, docResult, approvalsResult] = await Promise.all([
		supabase.rpc('get_workflow_meeting', {
			p_incorporation_id: incorporationId,
		}),
		supabase
			.schema('documents' as never)
			.from('documents')
			.select(
				`id, file_name, file_title, bucket_path, bucket_storage, version,
				uploaded_at, uploaded_by, mime_type, file_size_bytes, notes`,
			)
			.eq('case_id', incorporationId)
			.eq('document_type_id', PLANNING_DESIGN_DOC_TYPE_ID)
			.is('deleted_at', null)
			.order('version', { ascending: false })
			.limit(1)
			.maybeSingle(),
		supabase
			.schema('workflow' as never)
			.from('approval_records')
			.select('id, round, decision, comments, decided_at, decided_by')
			.eq('workflow_stage_id', stageId)
			.order('round', { ascending: false }),
	]);

	const meetingRaw = meetingResult.data as
		| (PlanningMeetingMeetingMini & { found?: boolean })
		| null;
	const meeting =
		meetingRaw && meetingRaw.found !== false
			? {
					id: meetingRaw.id,
					status: meetingRaw.status,
					scheduled_at: meetingRaw.scheduled_at,
					duration_minutes: meetingRaw.duration_minutes,
				}
			: null;

	const document = (docResult.data ?? null) as PlanningDesignDocument | null;
	const approvalHistory = (approvalsResult.data ?? []) as PlanningMeetingApproval[];
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
	const { stageStatus, meeting, document, latestApproval } = input;

	if (stageStatus === 'completed' || latestApproval?.decision === 'approved') {
		return 'approved';
	}

	// Si ya hay un documento subido por ops, la fase de "reunión" se considera
	// superada — sin importar si Zcal marcó la reunión como `completed` o no.
	// El cliente debe ver el documento aunque la reunión siga en `scheduled`.
	if (document) {
		if (latestApproval?.decision === 'rejected') {
			if (new Date(document.uploaded_at) > new Date(latestApproval.decided_at)) {
				return 'awaiting_approval';
			}
			return 'rejected';
		}
		return 'awaiting_approval';
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
