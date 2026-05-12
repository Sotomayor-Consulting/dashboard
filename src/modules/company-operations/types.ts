export type StatusTone = 'success' | 'warning' | 'danger' | 'neutral' | 'info';
export type Priority = 'low' | 'normal' | 'high' | 'urgent';

// Mapea los 6 estados de workflow.task_status a 3 buckets visuales
export type TaskStatus = 'pending' | 'in_progress' | 'completed';
export type StageStatus = 'pending' | 'in_progress' | 'completed';

export type Assignee = { name: string; initials: string };

export type Task = {
	id: string;
	title: string;
	description: string;
	priority: Priority;
	status: TaskStatus;
	assignee: Assignee | null;
};

export type Stage = {
	id: string; // workflow_stage_id (uuid de incorporation_workflow_stages)
	order: number;
	slug: string;
	name: string;
	slaHours: number;
	status: StageStatus;
	requiresApproval: boolean;
	approvalRole: string | null;
};

export type QueueItem = {
	id: string;
	title: string;
	assignee: string;
	priority: Priority;
	eta: string;
};

export type StatCard = {
	label: string;
	value: string;
	icon: string;
	tone: StatusTone;
};

export type SlaAlert = {
	id: string;
	stage: string;
	warning: string;
	remaining: string;
	progress: number;
};

export type WorkflowSummary = {
	workflowId: string;
	companyName: string;
	responsible: string;
	startedAt: string;
	stagesCompleted: number;
	stagesTotal: number;
};

export type CurrentStage = {
	id: string;
	slug: string;
	name: string;
	description: string;
	slaHours: number;
	requiresApproval: boolean;
	approvalRole: string | null;
	tasks: Task[];
};

export type OperationsPanelData =
	| {
			hasWorkflow: false;
			empresaId: string;
			empresaNombre: string;
	  }
	| {
			hasWorkflow: true;
			workflow: WorkflowSummary;
			stats: StatCard[];
			currentStage: CurrentStage | null;
			teamQueue: QueueItem[];
			stages: Stage[];
			slaAlerts: SlaAlert[];
	  };
