import type { SupabaseClient } from '@supabase/supabase-js';
import { createLogger } from '@infrastructure/logging';

const log = createLogger('domains.workflow');

export type WorkflowStatus =
	| 'not_started'
	| 'in_progress'
	| 'completed'
	| 'on_hold'
	| 'cancelled';

export type TaskStatus =
	| 'pending'
	| 'in_progress'
	| 'completed'
	| 'blocked'
	| 'skipped'
	| 'cancelled';

export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent';

export type ApprovalDecision = 'approved' | 'rejected' | 'requested_changes';

export interface IncorporationWorkflow {
	id: string;
	incorporation_id: string;
	current_stage_id: number | null;
	status: WorkflowStatus;
	started_at: string | null;
	completed_at: string | null;
	created_at: string;
	updated_at: string;
}

export interface WorkflowStage {
	id: string;
	workflow_id: string;
	stage_id: number;
	status: WorkflowStatus;
	display_order: number;
	assigned_to: string | null;
	started_by: string | null;
	due_at: string | null;
	sla_breached_at: string | null;
	started_at: string | null;
	completed_at: string | null;
	slug?: string;
	name?: string;
}

export interface WorkflowTask {
	id: string;
	workflow_stage_id: string;
	incorporation_id: string;
	template_task_id: number | null;
	title: string;
	description: string | null;
	status: TaskStatus;
	priority: TaskPriority;
	assigned_role: string | null;
	assigned_to: string | null;
	assigned_by: string | null;
	assigned_at: string | null;
	due_at: string | null;
	due_date: string | null;
	display_order: number;
	started_at: string | null;
	completed_at: string | null;
	completed_by: string | null;
	metadata: Record<string, unknown> | null;
	created_at: string;
	updated_at: string;
}

const wf = (s: SupabaseClient) => s.schema('workflow' as never);

export const getWorkflowByIncorporation = async (
	supabase: SupabaseClient,
	incorporationId: string,
) => {
	const { data, error } = await wf(supabase)
		.from('incorporation_workflows')
		.select(
			`*,
			current_stage:current_stage_id ( id, slug, name, display_order )`,
		)
		.eq('incorporation_id', incorporationId)
		.maybeSingle();
	if (error) {
		log.error('getWorkflowByIncorporation', { error });
		return null;
	}
	return data;
};

export const listStages = async (
	supabase: SupabaseClient,
	workflowId: string,
) => {
	const { data, error } = await wf(supabase)
		.from('incorporation_workflow_stages')
		.select(
			`*,
			catalog:stage_id ( slug, name, sla_hours, requires_approval, approval_role, auto_advance )`,
		)
		.eq('workflow_id', workflowId)
		.order('display_order', { ascending: true });
	if (error) {
		log.error('listStages', { error });
		return [];
	}
	return data ?? [];
};

export const listTasksByIncorporation = async (
	supabase: SupabaseClient,
	incorporationId: string,
	opts: { status?: TaskStatus; role?: string } = {},
) => {
	let q = wf(supabase)
		.from('incorporation_tasks')
		.select(
			`*,
			stage:workflow_stage_id ( id, stage_id, status, display_order,
				catalog:stage_id ( slug, name ) )`,
		)
		.eq('incorporation_id', incorporationId)
		.order('display_order', { ascending: true });

	if (opts.status) q = q.eq('status', opts.status);
	if (opts.role) q = q.eq('assigned_role', opts.role);

	const { data, error } = await q;
	if (error) {
		log.error('listTasksByIncorporation', { error });
		return [];
	}
	return data ?? [];
};

export const listPendingTasksForRole = async (
	supabase: SupabaseClient,
	role: 'admin' | 'operaciones' | 'operations' | 'cliente' | 'client' | 'partner',
	limit = 100,
) => {
	const roleMap: Record<string, string> = {
		operaciones: 'operations',
		cliente: 'client',
	};
	const assignedRole = roleMap[role] ?? role;

	const { data, error } = await wf(supabase)
		.from('incorporation_tasks')
		.select(
			`id, title, priority, due_date, incorporation_id, workflow_stage_id,
			stage:workflow_stage_id ( catalog:stage_id ( slug, name ) )`,
		)
		.eq('assigned_role', assignedRole)
		.in('status', ['pending', 'in_progress'])
		.order('priority', { ascending: false })
		.order('created_at', { ascending: true })
		.limit(limit);
	if (error) {
		log.error('listPendingTasksForRole', { error });
		return [];
	}
	return data ?? [];
};

export const listPendingApprovals = async (supabase: SupabaseClient) => {
	const { data, error } = await wf(supabase)
		.from('incorporation_workflow_stages')
		.select(
			`id, workflow_id, status,
			catalog:stage_id!inner ( slug, name, requires_approval, approval_role ),
			workflow:workflow_id ( incorporation_id,
				empresa:incorporation_id ( principal_name, user_id ) )`,
		)
		.eq('status', 'not_started')
		.eq('catalog.requires_approval', true);
	if (error) {
		log.error('listPendingApprovals', { error });
		return [];
	}
	return data ?? [];
};

// ─── Mutations (RPC) ──────────────────────────────────────────

export const completeTask = async (
	supabase: SupabaseClient,
	taskId: string,
	userId?: string,
) => {
	const { data, error } = await supabase.rpc('workflow_complete_task', {
		p_task_id: taskId,
		p_user_id: userId ?? null,
	});
	if (error) {
		log.error('completeTask', { error });
		return { ok: false, error: error.message };
	}
	return data as { ok: boolean; stage_completed?: boolean };
};

export const advanceStage = async (
	supabase: SupabaseClient,
	workflowId: string,
) => {
	const { data, error } = await supabase.rpc('workflow_advance_stage', {
		p_workflow_id: workflowId,
	});
	if (error) {
		log.error('advanceStage', { error });
		return { ok: false, error: error.message };
	}
	return data as {
		ok: boolean;
		current_stage_id?: number;
		workflow_completed?: boolean;
	};
};

export const recordApproval = async (
	supabase: SupabaseClient,
	stageId: string,
	decision: ApprovalDecision,
	comments?: string,
	userId?: string,
) => {
	const { data, error } = await supabase.rpc('workflow_record_approval', {
		p_stage_id: stageId,
		p_decision: decision,
		p_comments: comments ?? null,
		p_user_id: userId ?? null,
	});
	if (error) {
		log.error('recordApproval', { error });
		return { ok: false, error: error.message };
	}
	return data as { ok: boolean };
};

/** Crea el workflow manualmente (backfill/reintento). Normalmente lo dispara el trigger on pagos. */
export const createWorkflowForIncorporation = async (
	supabase: SupabaseClient,
	incorporationId: string,
	planId: number,
) => {
	const { data, error } = await supabase.rpc(
		'create_workflow_for_incorporation',
		{
			p_incorporation_id: incorporationId,
			p_plan_id: planId,
		},
	);
	if (error) {
		log.error('createWorkflowForIncorporation', { error });
		return null;
	}
	return data as string | null;
};
