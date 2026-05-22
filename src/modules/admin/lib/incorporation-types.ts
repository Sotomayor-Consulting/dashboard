/**
 * Tipos del módulo Empresas del panel admin.
 * Mapean `empresas_incorporaciones` + joins de `usuarios`, `pagos`,
 * `incorporation_workflow` y `documentos_por_firmar` a una forma serializada
 * apta para el front.
 */

export const COMPANY_PRIORITY = ['normal', 'high', 'urgent'] as const;
export type CompanyPriority = (typeof COMPANY_PRIORITY)[number];

export const PAYMENT_STATUS = [
	'paid',
	'pending',
	'overdue',
	'upgrade',
	'unpaid',
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUS)[number];

/** Filtros pill de la tabla de incorporaciones. */
export const INCORPORATIONS_FILTERS = [
	'todas',
	'atencion',
	'esperando_cliente',
	'esperando_ops',
	'estancadas',
] as const;
export type IncorporationsFilter = (typeof INCORPORATIONS_FILTERS)[number];

/** Quién bloquea el avance: cliente, ops o nadie (todo al día). */
export type AwaitingActor = 'cliente' | 'ops' | 'none';

export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent';
export type TaskStatus =
	| 'pending'
	| 'in_progress'
	| 'completed'
	| 'blocked'
	| 'skipped';

export interface IncorporationTask {
	id: string;
	title: string;
	description: string | null;
	status: TaskStatus;
	priority: TaskPriority | null;
	/** "operations" / "client" / "admin" / etc. */
	assignedRole: string | null;
	dueAt: string | null;
	completedAt: string | null;
}

export interface AdminCompanyClient {
	id: string;
	name: string;
	email: string;
	avatarUrl: string | null;
}

export interface AdminCompany {
	/** UUID de `empresas_incorporaciones.empresa_incorporacion_id`. */
	id: string;
	name: string;
	type: string | null;
	stateUs: string | null;
	/** Estado del proceso: 'En proceso', 'Upgrade', etc. */
	status: string | null;
	/** 0..100, redondeado. */
	progress: number;
	/** Nombre corto de la etapa actual del workflow (si existe). */
	currentStage: string | null;
	client: AdminCompanyClient | null;
	paymentStatus: PaymentStatus;
	pendingDocs: number;
	priority: CompanyPriority;
	lastActivityAt: string | null;
	createdAt: string | null;

	// --- Enriquecimiento operativo ---
	/** Días transcurridos desde el inicio del workflow. */
	daysInProcess: number | null;
	/** Total tareas abiertas (pending + in_progress + blocked). */
	openTasksCount: number;
	/** ¿Quién está bloqueando el avance? */
	awaiting: AwaitingActor;
	/** Próxima tarea pendiente (la primera abierta por display_order). */
	nextTask: { title: string; assignedRole: string | null } | null;
	/** Fecha de arranque del workflow (started_at). */
	workflowStartedAt: string | null;
}

export interface AdminCompanyPayment {
	id: string;
	service: string;
	amount: number;
	status: PaymentStatus;
	chargedAt: string | null;
}

export interface AdminCompanyDocument {
	id: string;
	name: string;
	status: 'pending' | 'received' | 'rejected';
	uploadedAt: string | null;
}

export interface AdminCompanyDetail extends AdminCompany {
	documents: AdminCompanyDocument[];
	payments: AdminCompanyPayment[];
	tasks: IncorporationTask[];
}
