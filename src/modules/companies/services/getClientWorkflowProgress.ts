import type { SupabaseClient } from '@supabase/supabase-js';

type StageState = 'completed' | 'in_progress' | 'pending';

export interface ClientWorkflowStageItem {
	id: string;
	name: string;
	slug: string;
	status: StageState;
	displayOrder: number;
	dueAt: string | null;
}

export interface ClientWorkflowTaskItem {
	id: string;
	title: string;
	status: string;
	dueAt: string | null;
	stageName: string | null;
}

export interface ClientWorkflowEventItem {
	id: string;
	title: string;
	date: string;
	type: 'deadline' | 'stage';
}

export interface ClientWorkflowNotificationItem {
	id: string;
	message: string;
	time: string;
}

export interface ClientWorkflowProgressData {
	companyName: string;
	businessType: string | null;
	workflowStatus: string;
	progressPercent: number;
	completedStages: number;
	totalStages: number;
	currentStageName: string | null;
	estimatedCompletion: string | null;
	stages: ClientWorkflowStageItem[];
	pendingClientTasks: ClientWorkflowTaskItem[];
	upcomingEvents: ClientWorkflowEventItem[];
	notifications: ClientWorkflowNotificationItem[];
}

const toStageState = (status: string): StageState => {
	if (status === 'completed') return 'completed';
	if (status === 'in_progress') return 'in_progress';
	return 'pending';
};

const relativeTime = (dateIso: string): string => {
	const date = new Date(dateIso);
	if (Number.isNaN(date.getTime())) return 'Hace un momento';

	const diffMs = Date.now() - date.getTime();
	const minutes = Math.floor(diffMs / 60000);
	if (minutes < 1) return 'Hace un momento';
	if (minutes < 60) return `Hace ${minutes} min`;

	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `Hace ${hours} h`;

	const days = Math.floor(hours / 24);
	return `Hace ${days} d`;
};

type WorkflowRow = {
	id: string;
	status: string;
	current_stage_id: number | null;
};

type StageRow = {
	id: string;
	stage_id: number;
	status: string;
	display_order: number;
	due_at: string | null;
};

type CatalogRow = {
	id: number;
	slug: string;
	name: string;
};

type TaskRow = {
	id: string;
	title: string;
	status: string;
	due_at: string | null;
	assigned_role: string | null;
	workflow_stage_id: string;
	completed_at: string | null;
};

export const getClientWorkflowProgress = async (
	supabase: SupabaseClient,
	incorporationId: string,
): Promise<ClientWorkflowProgressData | null> => {
	const emptyState = (
		companyName = 'Empresa sin nombre',
		businessType: string | null = null,
		workflowStatus = 'not_started',
	): ClientWorkflowProgressData => ({
		companyName,
		businessType,
		workflowStatus,
		progressPercent: 0,
		completedStages: 0,
		totalStages: 0,
		currentStageName: null,
		estimatedCompletion: null,
		stages: [],
		pendingClientTasks: [],
		upcomingEvents: [],
		notifications: [],
	});

	const { data: empresa, error: empresaError } = await supabase
		.from('empresas_incorporaciones')
		.select('nombre_1, tipo_de_negocio')
		.eq('empresa_incorporacion_id', incorporationId)
		.maybeSingle();

	if (empresaError || !empresa) return null;

	const { data: workflow, error: workflowError } = await supabase
		.schema('workflow' as never)
		.from('incorporation_workflows')
		.select('id, status, current_stage_id')
		.eq('incorporation_id', incorporationId)
		.maybeSingle();

	if (workflowError) {
		return emptyState(empresa.nombre_1 ?? 'Empresa sin nombre', empresa.tipo_de_negocio);
	}

	if (!workflow) {
		return emptyState(empresa.nombre_1 ?? 'Empresa sin nombre', empresa.tipo_de_negocio);
	}

	const typedWorkflow = workflow as WorkflowRow;

	const [{ data: stagesRaw, error: stagesError }, { data: tasksRaw, error: tasksError }] =
		await Promise.all([
			supabase
				.schema('workflow' as never)
				.from('incorporation_workflow_stages')
				.select('id, stage_id, status, display_order, due_at')
				.eq('workflow_id', typedWorkflow.id)
				.order('display_order', { ascending: true }),
			supabase
				.schema('workflow' as never)
				.from('incorporation_tasks')
				.select(
					'id, title, status, due_at, assigned_role, workflow_stage_id, completed_at',
				)
				.eq('incorporation_id', incorporationId)
				.order('display_order', { ascending: true }),
		]);

	if (stagesError || tasksError) {
		return emptyState(
			empresa.nombre_1 ?? 'Empresa sin nombre',
			empresa.tipo_de_negocio,
			typedWorkflow.status,
		);
	}

	const stageIds = ((stagesRaw ?? []) as StageRow[]).map((s) => s.stage_id);
	const uniqueStageIds = [...new Set(stageIds)];

	const { data: catalogRows, error: catalogError } = await supabase
		.schema('workflow' as never)
		.from('workflow_stage_catalog')
		.select('id, slug, name')
		.in('id', uniqueStageIds.length ? uniqueStageIds : [-1]);

	if (catalogError) {
		return emptyState(
			empresa.nombre_1 ?? 'Empresa sin nombre',
			empresa.tipo_de_negocio,
			typedWorkflow.status,
		);
	}

	const catalogMap = new Map<number, CatalogRow>();
	for (const row of (catalogRows ?? []) as CatalogRow[]) {
		catalogMap.set(row.id, row);
	}

	const stages = ((stagesRaw ?? []) as StageRow[])
		.map((item) => {
			const catalog = catalogMap.get(item.stage_id);
			return {
				id: item.id,
				name: catalog?.name ?? 'Etapa',
				slug: catalog?.slug ?? '',
				status: toStageState(item.status),
				displayOrder: item.display_order,
				dueAt: item.due_at,
			};
		})
		.sort((a, b) => a.displayOrder - b.displayOrder);

	const completedStages = stages.filter((stage) => stage.status === 'completed').length;
	const totalStages = stages.length;
	const progressPercent =
		totalStages > 0 ? Math.round((completedStages / totalStages) * 100) : 0;

	const stageMap = new Map(stages.map((stage) => [stage.id, stage]));

	const pendingClientTasks = ((tasksRaw ?? []) as TaskRow[])
		.map((item) => {
			const stage = stageMap.get(item.workflow_stage_id);

			return {
				id: item.id,
				title: item.title,
				status: item.status,
				dueAt: item.due_at,
				assignedRole: item.assigned_role,
				stageName: stage?.name ?? null,
				completedAt: item.completed_at,
			};
		})
		.filter(
			(task) =>
				(task.assignedRole === 'client' || task.assignedRole === 'cliente') &&
				task.status !== 'completed' &&
				task.status !== 'cancelled' &&
				task.status !== 'skipped',
		)
		.slice(0, 5)
		.map(({ id, title, status, dueAt, stageName }) => ({
			id,
			title,
			status,
			dueAt,
			stageName,
		}));

	const upcomingEvents = stages
		.filter((stage) => stage.status !== 'completed' && stage.dueAt)
		.slice(0, 3)
		.map((stage) => ({
			id: stage.id,
			title: `Fecha objetivo: ${stage.name}`,
			date: stage.dueAt as string,
			type: 'deadline' as const,
		}));

	const notifications = ((tasksRaw ?? []) as TaskRow[])
		.filter((task) => task.status === 'completed' && task.completed_at)
		.sort((a, b) =>
			new Date(b.completed_at as string).getTime() -
			new Date(a.completed_at as string).getTime(),
		)
		.slice(0, 3)
		.map((task) => ({
			id: task.id,
			message: `Tarea completada: ${task.title}`,
			time: relativeTime(task.completed_at as string),
		}));

	const currentStageName = stages.find((stage) => stage.status === 'in_progress')?.name ??
		null;

	const estimatedCompletion = stages
		.filter((stage) => stage.status !== 'completed' && stage.dueAt)
		.map((stage) => stage.dueAt as string)
		.sort()[0] ?? null;

	return {
		companyName: empresa.nombre_1 ?? 'Empresa sin nombre',
		businessType: empresa.tipo_de_negocio,
		workflowStatus: typedWorkflow.status,
		progressPercent,
		completedStages,
		totalStages,
		currentStageName,
		estimatedCompletion,
		stages,
		pendingClientTasks,
		upcomingEvents,
		notifications,

	};
};
