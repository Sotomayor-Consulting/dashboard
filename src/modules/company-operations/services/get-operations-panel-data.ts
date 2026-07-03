import type { SupabaseClient } from '@supabase/supabase-js';
import { createLogger } from '@infrastructure/logging';

const log = createLogger('operations-panel.data');
import {
	getWorkflowByIncorporation,
	listStages,
	listTasksByIncorporation,
	listPendingTasksForRole,
	type TaskPriority,
	type TaskStatus as DomainTaskStatus,
} from '@domains/workflow';
import type {
	Assignee,
	CurrentStage,
	OperationsPanelData,
	Priority,
	QueueItem,
	SlaAlert,
	Stage,
	StageStatus,
	StatCard,
	Task,
	TaskStatus,
	WorkflowSummary,
} from '../types';

// ─── Helpers ──────────────────────────────────────────────

const toInitials = (nombre?: string | null, apellido?: string | null) => {
	const n = (nombre || '').trim();
	const a = (apellido || '').trim();
	const i1 = n ? n[0]! : '';
	const i2 = a ? a[0]! : '';
	return (i1 + i2).toUpperCase() || '?';
};

const formatName = (nombre?: string | null, apellido?: string | null) =>
	[nombre, apellido].filter(Boolean).join(' ').trim();

const formatDate = (iso: string | null | undefined) => {
	if (!iso) return '—';
	const d = new Date(iso);
	if (isNaN(d.getTime())) return '—';
	return d.toLocaleDateString('es-MX', {
		day: 'numeric',
		month: 'numeric',
		year: 'numeric',
	});
};

// Bucketiza los 6 estados reales a los 3 que renderiza la UI
const mapTaskStatus = (s: DomainTaskStatus): TaskStatus => {
	if (s === 'completed') return 'completed';
	if (s === 'in_progress') return 'in_progress';
	return 'pending'; // pending | blocked | skipped | cancelled
};

const mapStageStatus = (s: string): StageStatus => {
	if (s === 'completed') return 'completed';
	if (s === 'in_progress') return 'in_progress';
	return 'pending';
};

const mapPriority = (p: TaskPriority): Priority => p;

const hoursBetween = (a: Date, b: Date) =>
	Math.round((b.getTime() - a.getTime()) / 36e5);

const formatEta = (dueAt: string | null | undefined): string => {
	if (!dueAt) return 'Sin fecha';
	const due = new Date(dueAt);
	const now = new Date();
	const diffH = hoursBetween(now, due);
	if (diffH < 0) return `Vencida hace ${Math.abs(diffH)}h`;
	if (diffH < 1) return '<1h';
	if (diffH < 48) return `${diffH}h`;
	return `${Math.round(diffH / 24)} días`;
};

// Mapa rápido userId → { nombre, apellido } para resolver assignees en bloque
const fetchUsersByIds = async (
	supabase: SupabaseClient,
	ids: string[],
): Promise<Map<string, { nombre: string | null; apellido: string | null }>> => {
	const unique = Array.from(new Set(ids.filter(Boolean)));
	if (unique.length === 0) return new Map();
	const { data, error } = await supabase
		.from('usuarios')
		.select('user_id, nombre, apellido')
		.in('user_id', unique);
	if (error || !data) {
		log.error('fetchUsersByIds', { error });
		return new Map();
	}
	const m = new Map<string, { nombre: string | null; apellido: string | null }>();
	for (const u of data) {
		m.set(u.user_id as string, {
			nombre: (u as { nombre?: string | null }).nombre ?? null,
			apellido: (u as { apellido?: string | null }).apellido ?? null,
		});
	}
	return m;
};

// ─── Aggregator ───────────────────────────────────────────

export async function getOperationsPanelData(
	supabase: SupabaseClient,
	empresaId: string,
	empresaNombre?: string | null,
): Promise<OperationsPanelData> {
	const workflow = await getWorkflowByIncorporation(supabase, empresaId);

	if (!workflow) {
		return {
			hasWorkflow: false,
			empresaId,
			empresaNombre: empresaNombre || '—',
		};
	}

	const workflowId = (workflow as { id: string }).id;
	const currentStageCatalogId =
		(workflow as { current_stage_id?: number | null }).current_stage_id ?? null;
	const startedAt = (workflow as { started_at?: string | null }).started_at;

	const [stagesRaw, tasksRaw, teamQueueRaw, ownerRow] = await Promise.all([
		listStages(supabase, workflowId),
		listTasksByIncorporation(supabase, empresaId),
		listPendingTasksForRole(supabase, 'operaciones', 8),
		supabase
			.from('incorporations')
			.select('user_id, principal_name')
			.eq('id', empresaId)
			.maybeSingle(),
	]);

	// Resolver usuarios (responsable cliente + assignees de tareas + de la cola)
	const userIds: string[] = [];
	const ownerId = (ownerRow.data as { user_id?: string } | null)?.user_id;
	if (ownerId) userIds.push(ownerId);
	for (const t of tasksRaw) {
		const aid = (t as { assigned_to?: string | null }).assigned_to;
		if (aid) userIds.push(aid);
	}
	for (const q of teamQueueRaw) {
		const aid = (q as unknown as { assigned_to?: string | null }).assigned_to;
		if (aid) userIds.push(aid);
	}
	const usersById = await fetchUsersByIds(supabase, userIds);

	// ─── Stages ─────────────────────────────────────────
	// Agrupar tareas por stage_id para inyectarlas en cada stage
	const tasksByStageId = new Map<string, Task[]>();
	for (const t of tasksRaw) {
		const stageDbId = (t as { workflow_stage_id: string }).workflow_stage_id;
		const aid = (t as { assigned_to?: string | null }).assigned_to ?? null;
		const u = aid ? usersById.get(aid) : null;
		const assignee: Assignee | null =
			aid && u
				? {
						name: formatName(u.nombre, u.apellido) || 'Sin nombre',
						initials: toInitials(u.nombre, u.apellido),
					}
				: null;
		const task: Task = {
			id: (t as { id: string }).id,
			title: (t as { title: string }).title,
			description: (t as { description?: string | null }).description ?? '',
			priority: mapPriority((t as { priority: TaskPriority }).priority),
			status: mapTaskStatus((t as { status: DomainTaskStatus }).status),
			assignee,
		};
		const arr = tasksByStageId.get(stageDbId) ?? [];
		arr.push(task);
		tasksByStageId.set(stageDbId, arr);
	}

	const stages: Stage[] = stagesRaw.map((s) => {
		const cat = (s as { catalog?: Record<string, unknown> }).catalog ?? {};
		const stageId = (s as { id: string }).id;
		return {
			id: stageId,
			order: (s as { display_order: number }).display_order,
			slug: (cat['slug'] as string) ?? '',
			name: (cat['name'] as string) ?? '—',
			slaHours: (cat['sla_hours'] as number) ?? 0,
			status: mapStageStatus((s as { status: string }).status),
			requiresApproval: Boolean(cat['requires_approval']),
			approvalRole: (cat['approval_role'] as string | null) ?? null,
			tasks: tasksByStageId.get(stageId) ?? [],
		};
	});

	const stagesCompleted = stages.filter((s) => s.status === 'completed').length;
	const stagesTotal = stages.length;

	// Stage actual = la marcada en workflow.current_stage_id (catalog id)
	const currentStageRow = stagesRaw.find(
		(s) => (s as { stage_id: number }).stage_id === currentStageCatalogId,
	);

	// ─── Current stage (reutiliza tareas ya agrupadas) ──
	const currentStageDbId = currentStageRow
		? (currentStageRow as { id: string }).id
		: null;
	const currentStageTasks: Task[] = currentStageDbId
		? (tasksByStageId.get(currentStageDbId) ?? [])
		: [];

	let currentStage: CurrentStage | null = null;
	if (currentStageRow) {
		const cat =
			(currentStageRow as { catalog?: Record<string, unknown> }).catalog ?? {};
		currentStage = {
			id: (currentStageRow as { id: string }).id,
			slug: (cat['slug'] as string) ?? '',
			name: (cat['name'] as string) ?? '—',
			description: `Stage ${(currentStageRow as { display_order: number }).display_order} de ${stagesTotal}`,
			slaHours: (cat['sla_hours'] as number) ?? 0,
			requiresApproval: Boolean(cat['requires_approval']),
			approvalRole: (cat['approval_role'] as string | null) ?? null,
			tasks: currentStageTasks,
		};
	}

	// ─── Stats ──────────────────────────────────────────
	const now = new Date();
	const in24h = new Date(now.getTime() + 24 * 36e5);
	const allTasks = tasksRaw as Array<{
		status: DomainTaskStatus;
		due_at: string | null;
	}>;
	const pendingCount = allTasks.filter((t) => t.status === 'pending').length;
	const inProgressCount = allTasks.filter(
		(t) => t.status === 'in_progress',
	).length;
	const dueSoonCount = allTasks.filter(
		(t) =>
			(t.status === 'pending' || t.status === 'in_progress') &&
			t.due_at &&
			new Date(t.due_at) <= in24h &&
			new Date(t.due_at) >= now,
	).length;

	const stats: StatCard[] = [
		{
			label: 'Tareas pendientes',
			value: String(pendingCount),
			icon: 'ri:list-check-2',
			tone: pendingCount > 0 ? 'warning' : 'neutral',
		},
		{
			label: 'En progreso',
			value: String(inProgressCount),
			icon: 'ri:line-chart-line',
			tone: 'neutral',
		},
		{
			label: 'Por vencer (24h)',
			value: String(dueSoonCount),
			icon: 'ri:error-warning-line',
			tone: dueSoonCount > 0 ? 'danger' : 'neutral',
		},
		{
			label: 'SLA etapa actual',
			value: currentStage ? `${currentStage.slaHours}h` : '—',
			icon: 'ri:timer-line',
			tone: 'success',
		},
	];

	// ─── Team queue (global, rol operations) ────────────
	const teamQueue: QueueItem[] = teamQueueRaw.map((q) => {
		const row = q as {
			id: string;
			title: string;
			priority: TaskPriority;
			due_at?: string | null;
			assigned_to?: string | null;
		};
		const u = row.assigned_to ? usersById.get(row.assigned_to) : null;
		const assigneeName = u
			? formatName(u.nombre, u.apellido) || 'Sin nombre'
			: 'Sin asignar';
		return {
			id: row.id,
			title: row.title,
			assignee: assigneeName,
			priority: mapPriority(row.priority),
			eta: formatEta(row.due_at ?? null),
		};
	});

	// ─── SLA alerts: stages in_progress que cruzaron sla_warning_hours
	const slaAlerts: SlaAlert[] = [];
	for (const s of stagesRaw) {
		const status = (s as { status: string }).status;
		if (status !== 'in_progress') continue;
		const startedAtStage = (s as { started_at?: string | null }).started_at;
		if (!startedAtStage) continue;
		const cat = (s as { catalog?: Record<string, unknown> }).catalog ?? {};
		const slaHours = (cat['sla_hours'] as number | null) ?? 0;
		const warnHours = (cat['sla_warning_hours'] as number | null) ?? 0;
		if (!slaHours || !warnHours) continue;
		const elapsed = hoursBetween(new Date(startedAtStage), now);
		if (elapsed < warnHours) continue;
		const remaining = slaHours - elapsed;
		const progress = Math.min(100, Math.round((elapsed / slaHours) * 100));
		slaAlerts.push({
			id: (s as { id: string }).id,
			stage: (cat['name'] as string) ?? '—',
			warning: `SLA Warning: ${warnHours}h transcurridas`,
			remaining:
				remaining > 0 ? `${remaining}h restantes` : `Vencido por ${Math.abs(remaining)}h`,
			progress,
		});
	}

	// ─── Workflow summary ──────────────────────────────
	const ownerName = ownerId
		? formatName(
				usersById.get(ownerId)?.nombre,
				usersById.get(ownerId)?.apellido,
			) || 'Sin asignar'
		: 'Sin asignar';

	const workflowSummary: WorkflowSummary = {
		workflowId,
		companyName:
			empresaNombre ||
			((ownerRow.data as { principal_name?: string } | null)?.principal_name ??
				'—'),
		responsible: ownerName,
		startedAt: formatDate(startedAt),
		stagesCompleted,
		stagesTotal,
	};

	return {
		hasWorkflow: true,
		workflow: workflowSummary,
		stats,
		currentStage,
		teamQueue,
		stages,
		slaAlerts,
	};
}
