import type { SupabaseClient } from '@supabase/supabase-js';

import { supabaseAdmin } from '@infrastructure/supabase/admin';
import type {
	AdminCompany,
	AdminCompanyDetail,
	AdminCompanyDocument,
	AdminCompanyPayment,
	AwaitingActor,
	CompanyPriority,
	IncorporationTask,
	PaymentStatus,
	TaskPriority,
	TaskStatus,
} from '@modules/admin/lib/incorporation-types';

/**
 * Resuelve tareas del schema `workflow` para una lista de incorporaciones.
 * Devuelve, por incorporation_id:
 *   - openCount: cuántas tareas abiertas
 *   - next: la primera tarea pendiente (display_order asc)
 *   - awaiting: 'cliente' | 'ops' | 'none' (derivado de assigned_role de la
 *     próxima tarea bloqueante)
 */
async function loadTasksSummary(
	incorporationIds: string[],
): Promise<
	Map<
		string,
		{
			openCount: number;
			next: { title: string; assignedRole: string | null } | null;
			awaiting: AwaitingActor;
		}
	>
> {
	const map = new Map<
		string,
		{
			openCount: number;
			next: { title: string; assignedRole: string | null } | null;
			awaiting: AwaitingActor;
		}
	>();
	if (incorporationIds.length === 0) return map;

	// Tareas con su stage join. Filtramos las del stage completado/skipped:
	// el sistema marca stages como completed sin propagar a las tareas, así
	// que una tarea pending en un stage completed es efectivamente "completed"
	// y NO debe contarse como abierta.
	const { data, error } = await supabaseAdmin
		.schema('workflow')
		.from('incorporation_tasks')
		.select(
			`incorporation_id, title, status, assigned_role, display_order,
			 workflow_stage:workflow_stage_id (status, display_order)`,
		)
		.in('incorporation_id', incorporationIds)
		.in('status', ['pending', 'in_progress', 'blocked']);

	if (error || !data) return map;

	type Row = {
		incorporation_id: string;
		title: string;
		status: string;
		assigned_role: string | null;
		display_order: number | null;
		workflow_stage:
		| { status: string | null; display_order: number | null }
		| Array<{ status: string | null; display_order: number | null }>
		| null;
	};

	function stageOf(r: Row) {
		return Array.isArray(r.workflow_stage)
			? (r.workflow_stage[0] ?? null)
			: r.workflow_stage;
	}

	// Ordenar por stage.display_order ASC, luego task.display_order ASC
	const rows = (data as Row[]).filter((r) => {
		const stage = stageOf(r);
		const stageStatus = (stage?.status ?? '').toLowerCase();
		// Excluimos tareas cuyo stage ya no está activo:
		//   - completed: ya terminado (tareas internas son histórico)
		//   - cancelled: stage no aplica al plan contratado (ej. Upgrade)
		//   - on_hold:   stage pausado, no es trabajo "abierto"
		return (
			stageStatus !== 'completed' &&
			stageStatus !== 'cancelled' &&
			stageStatus !== 'on_hold'
		);
	});
	rows.sort((a, b) => {
		const sa = stageOf(a)?.display_order ?? 0;
		const sb = stageOf(b)?.display_order ?? 0;
		if (sa !== sb) return sa - sb;
		return (a.display_order ?? 0) - (b.display_order ?? 0);
	});

	for (const row of rows) {
		const id = row.incorporation_id;
		const existing = map.get(id) ?? {
			openCount: 0,
			next: null as { title: string; assignedRole: string | null } | null,
			awaiting: 'none' as AwaitingActor,
		};
		existing.openCount += 1;
		if (!existing.next) {
			existing.next = { title: row.title, assignedRole: row.assigned_role };
			const role = (row.assigned_role ?? '').toLowerCase();
			existing.awaiting =
				role === 'client' || role === 'cliente'
					? 'cliente'
					: role === 'operations' || role === 'operaciones' || role === 'admin'
						? 'ops'
						: 'none';
		}
		map.set(id, existing);
	}
	return map;
}

/**
 * Lee `workflow.incorporation_workflows.started_at` para cada incorporación.
 */
async function loadWorkflowStartDates(
	incorporationIds: string[],
): Promise<Map<string, string>> {
	const map = new Map<string, string>();
	if (incorporationIds.length === 0) return map;
	const { data } = await supabaseAdmin
		.schema('workflow')
		.from('incorporation_workflows')
		.select('incorporation_id, started_at')
		.in('incorporation_id', incorporationIds);
	for (const row of (data ?? []) as Array<{
		incorporation_id: string;
		started_at: string | null;
	}>) {
		if (row.started_at) map.set(row.incorporation_id, row.started_at);
	}
	return map;
}

function daysBetween(iso: string | null): number | null {
	if (!iso) return null;
	const ms = Date.now() - new Date(iso).getTime();
	return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

const URGENT_DAYS = 30;
const HIGH_DAYS = 14;

function derivePriority(
	lastActivityAt: string | null,
	progress: number,
): CompanyPriority {
	if (progress >= 100) return 'normal';
	if (!lastActivityAt) return 'high';
	const ms = Date.now() - new Date(lastActivityAt).getTime();
	const days = ms / (1000 * 60 * 60 * 24);
	if (days >= URGENT_DAYS) return 'urgent';
	if (days >= HIGH_DAYS) return 'high';
	return 'normal';
}

function derivePaymentStatus(
	estado: string | null,
	pagos: Array<{ status: string | null }>,
): PaymentStatus {
	if ((estado ?? '').toLowerCase() === 'upgrade') return 'upgrade';
	if (pagos.length === 0) return 'unpaid';
	const norm = pagos.map((p) => (p.status ?? '').toLowerCase());
	if (norm.some((s) => s === 'overdue' || s === 'vencido')) return 'overdue';
	if (norm.some((s) => s === 'paid' || s === 'pagado')) return 'paid';
	return 'pending';
}

/**
 * Lista todas las empresas con su cliente, pagos agregados, docs pendientes
 * y etapa actual del workflow. Para la vista de admin/operaciones.
 */
export async function listAdminCompanies(
	supabase: SupabaseClient,
): Promise<AdminCompany[]> {
	const { data: empresas, error } = await supabase
		.from('incorporations')
		.select(
			`id, principal_name, entity_type,
			 estado_de_incorporacion, state, porcentaje_de_incorporacion,
			 updated_at, user_id, company_id,
			 usuarios:user_id ( user_id, nombre, apellido, correo, avatar_url )`,
		)
		.order('updated_at', { ascending: false });

	if (error) throw error;
	if (!empresas) return [];

	// Bulk-load relacionados para no hacer N+1
	const ids = empresas
		.map((e: { id: string }) => e.id)
		.filter(Boolean);

	const [{ data: pagosRows }, { data: docsRows }, { data: workflowsRows }] =
		await Promise.all([
			supabase
				.from('pagos')
				.select('empresa_incorporacion_id, status')
				.in('empresa_incorporacion_id', ids),
			supabase
				.from('documentos_por_firmar')
				.select('empresa_incorporacion_id')
				.in('empresa_incorporacion_id', ids),
			supabase
				.from('incorporation_workflow')
				.select('company_id, current_stage')
				.in(
					'company_id',
					empresas.map((e: { company_id: string | null }) => e.company_id).filter(Boolean) as string[],
				),
		]);

	const pagosByEmpresa = new Map<string, Array<{ status: string | null }>>();
	for (const p of pagosRows ?? []) {
		const row = p as { empresa_incorporacion_id: string; status: string | null };
		const arr = pagosByEmpresa.get(row.empresa_incorporacion_id) ?? [];
		arr.push({ status: row.status });
		pagosByEmpresa.set(row.empresa_incorporacion_id, arr);
	}

	const docsCount = new Map<string, number>();
	for (const d of docsRows ?? []) {
		const row = d as { empresa_incorporacion_id: string };
		docsCount.set(
			row.empresa_incorporacion_id,
			(docsCount.get(row.empresa_incorporacion_id) ?? 0) + 1,
		);
	}

	const workflowByCompany = new Map<string, string | null>();
	for (const w of workflowsRows ?? []) {
		const row = w as { company_id: string; current_stage: string | null };
		workflowByCompany.set(row.company_id, row.current_stage);
	}

	// Enriquecimiento desde schema `workflow` (requiere service_role).
	const [tasksSummary, startDates] = await Promise.all([
		loadTasksSummary(ids),
		loadWorkflowStartDates(ids),
	]);

	return empresas.map((raw): AdminCompany => {
		const e = raw as {
			id: string;
			principal_name: string | null;
			entity_type: string | null;
			estado_de_incorporacion: string | null;
			estado: string | null;
			porcentaje_de_incorporacion: number | null;
			updated_at: string | null;
			user_id: string | null;
			company_id: string | null;
			usuarios:
			| {
				user_id: string;
				nombre: string | null;
				apellido: string | null;
				correo: string | null;
				avatar_url: string | null;
			}
			| Array<{
				user_id: string;
				nombre: string | null;
				apellido: string | null;
				correo: string | null;
				avatar_url: string | null;
			}>
			| null;
		};

		const usuarioRaw = Array.isArray(e.usuarios) ? e.usuarios[0] : e.usuarios;
		const client = usuarioRaw
			? {
				id: usuarioRaw.user_id,
				name:
					[usuarioRaw.nombre, usuarioRaw.apellido]
						.filter(Boolean)
						.join(' ')
						.trim() ||
					usuarioRaw.correo ||
					'Sin nombre',
				email: usuarioRaw.correo ?? '',
				avatarUrl: usuarioRaw.avatar_url,
			}
			: null;

		const progress = Math.round(e.porcentaje_de_incorporacion ?? 0);
		const pagos = pagosByEmpresa.get(e.id) ?? [];

		const summary = tasksSummary.get(e.id) ?? {
			openCount: 0,
			next: null,
			awaiting: 'none' as AwaitingActor,
		};
		const startedAt = startDates.get(e.id) ?? null;

		return {
			id: e.id,
			name: e.principal_name ?? 'Sin nombre',
			type: e.entity_type,
			stateUs: e.estado_de_incorporacion,
			status: e.state,
			progress,
			currentStage: e.company_id
				? (workflowByCompany.get(e.company_id) ?? null)
				: null,
			client,
			paymentStatus: derivePaymentStatus(e.state, pagos),
			pendingDocs: docsCount.get(e.id) ?? 0,
			priority: derivePriority(e.updated_at, progress),
			lastActivityAt: e.updated_at,
			createdAt: e.updated_at,
			daysInProcess: daysBetween(startedAt ?? e.updated_at),
			openTasksCount: summary.openCount,
			awaiting: summary.awaiting,
			nextTask: summary.next,
			workflowStartedAt: startedAt,
		};
	});
}

/**
 * Carga todas las tareas (no solo pending) de una incorporación específica
 * para el tab Tareas del drawer.
 */
async function loadTasksForIncorporation(
	incorporationId: string,
): Promise<IncorporationTask[]> {
	const { data, error } = await supabaseAdmin
		.schema('workflow')
		.from('incorporation_tasks')
		.select(
			`id, title, description, status, priority, assigned_role, due_at,
			 completed_at, display_order,
			 workflow_stage:workflow_stage_id (status, completed_at, display_order)`,
		)
		.eq('incorporation_id', incorporationId);

	if (error || !data) return [];

	type Row = {
		id: string;
		title: string;
		description: string | null;
		status: string;
		priority: string | null;
		assigned_role: string | null;
		due_at: string | null;
		completed_at: string | null;
		display_order: number | null;
		workflow_stage:
		| {
			status: string | null;
			completed_at: string | null;
			display_order: number | null;
		}
		| Array<{
			status: string | null;
			completed_at: string | null;
			display_order: number | null;
		}>
		| null;
	};

	const stageOf = (r: Row) =>
		Array.isArray(r.workflow_stage)
			? (r.workflow_stage[0] ?? null)
			: r.workflow_stage;

	const rows = data as Row[];
	rows.sort((a, b) => {
		const sa = stageOf(a)?.display_order ?? 0;
		const sb = stageOf(b)?.display_order ?? 0;
		if (sa !== sb) return sa - sb;
		return (a.display_order ?? 0) - (b.display_order ?? 0);
	});

	return rows.map((r) => {
		const stage = stageOf(r);
		const stageStatus = (stage?.status ?? '').toLowerCase();
		const taskStatusRaw = (r.status as TaskStatus) ?? 'pending';

		// Derivamos el estado efectivo de la tarea desde el stage:
		//   - stage completed → tarea considerada completed (aunque task.status
		//     siga pending, porque el sistema marca el stage como done sin
		//     propagar a las tareas individuales)
		//   - stage cancelled → tarea skipped (etapa no aplica al plan, ej.
		//     una empresa con Upgrade no requiere stage X)
		//   - stage on_hold → la dejamos como pending (sigue en su estado real)
		let effectiveStatus: TaskStatus = taskStatusRaw;
		let effectiveCompletedAt = r.completed_at;
		if (stageStatus === 'completed' && taskStatusRaw !== 'completed') {
			effectiveStatus = 'completed';
			effectiveCompletedAt = r.completed_at ?? stage?.completed_at ?? null;
		} else if (stageStatus === 'cancelled' && taskStatusRaw !== 'skipped') {
			effectiveStatus = 'skipped';
		}

		return {
			id: r.id,
			title: r.title,
			description: r.description,
			status: effectiveStatus,
			priority: (r.priority as TaskPriority | null) ?? null,
			assignedRole: r.assigned_role,
			dueAt: r.due_at,
			completedAt: effectiveCompletedAt,
		};
	});
}

/**
 * Detalle de una empresa para el drawer: docs y pagos completos.
 */
export async function getAdminCompanyDetail(
	supabase: SupabaseClient,
	empresaId: string,
): Promise<AdminCompanyDetail | null> {
	const all = await listAdminCompanies(supabase);
	const base = all.find((c) => c.id === empresaId);
	if (!base) return null;

	const [{ data: pagosRows }, { data: docsRows }] = await Promise.all([
		supabase
			.from('pagos')
			.select(
				'id_pagos, amount, status, created_at, servicios:servicio_id ( nombre )',
			)
			.eq('empresa_incorporacion_id', empresaId)
			.order('created_at', { ascending: false }),
		supabase
			.from('documentos_por_firmar')
			.select('*')
			.eq('empresa_incorporacion_id', empresaId)
			.limit(50),
	]);

	const payments: AdminCompanyPayment[] = (pagosRows ?? []).map((p) => {
		const row = p as {
			id_pagos: string;
			amount: number | null;
			status: string | null;
			created_at: string | null;
			servicios:
			| { nombre: string | null }
			| Array<{ nombre: string | null }>
			| null;
		};
		const serv = Array.isArray(row.servicios) ? row.servicios[0] : row.servicios;
		const statusNorm = (row.status ?? '').toLowerCase();
		const paymentStatus: PaymentStatus =
			statusNorm === 'paid' || statusNorm === 'pagado'
				? 'paid'
				: statusNorm === 'overdue' || statusNorm === 'vencido'
					? 'overdue'
					: statusNorm === 'upgrade'
						? 'upgrade'
						: statusNorm === 'unpaid'
							? 'unpaid'
							: 'pending';
		return {
			id: row.id_pagos,
			service: serv?.nombre ?? 'Servicio',
			amount: row.amount ?? 0,
			status: paymentStatus,
			chargedAt: row.created_at,
		};
	});

	const documents: AdminCompanyDocument[] = (docsRows ?? []).map((d) => {
		const row = d as {
			id?: string;
			documento_id?: string;
			nombre_documento?: string;
			nombre?: string;
			estado?: string | null;
			created_at?: string | null;
		};
		return {
			id: String(row.id ?? row.documento_id ?? crypto.randomUUID()),
			name: row.nombre_documento ?? row.nombre ?? 'Documento',
			status:
				row.estado === 'recibido' || row.estado === 'received'
					? 'received'
					: row.estado === 'rechazado'
						? 'rejected'
						: 'pending',
			uploadedAt: row.created_at ?? null,
		};
	});

	const tasks = await loadTasksForIncorporation(empresaId);

	return { ...base, documents, payments, tasks };
}
