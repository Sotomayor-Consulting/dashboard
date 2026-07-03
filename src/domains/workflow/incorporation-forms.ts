// Acceso a datos del staging del formulario de incorporación.
//
// Tabla: workflow.incorporation_forms (1:1 con incorporations).
// Flujo de estado: draft → submitted → in_review → validated → rejected → promoted.
// Este módulo solo cubre el lado del cliente (draft + submit). La promoción a
// tablas canónicas (companies/members/company_members) vive en operaciones.

import type { SupabaseClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@infrastructure/supabase/admin';
import { createLogger } from '@infrastructure/logging';
import { INCORPORATION_FORM_VERSION } from '@modules/companies/stages/client-form/payload';

const log = createLogger('domains.incorporation-forms');

const TABLE = 'incorporation_forms';
/** El esquema `workflow` no es el `public` por defecto de PostgREST.
 *  `as never`: los tipos generados de la DB no incluyen el schema `workflow`
 *  (mismo patrón que `domains/workflow/index.ts`). */
const schema = (supabase: SupabaseClient) =>
	supabase.schema('workflow' as never);

export type IncorporationFormStatus =
	| 'draft'
	| 'submitted'
	| 'in_review'
	| 'validated'
	| 'rejected'
	| 'promoted';

/** Estados desde los que el cliente todavía puede editar/reenviar. */
const CLIENT_EDITABLE: ReadonlyArray<IncorporationFormStatus> = [
	'draft',
	'rejected',
];

/** ¿El formulario sigue siendo editable/reenviable por el cliente? */
export function isClientEditable(status: IncorporationFormStatus): boolean {
	return CLIENT_EDITABLE.includes(status);
}

export interface IncorporationFormRow {
	id: string;
	incorporation_id: string;
	user_id: string;
	workflow_task_id: string | null;
	form_version: string;
	payload: unknown;
	validated_payload: unknown | null;
	progress_percent: number;
	current_step: string | null;
	status: IncorporationFormStatus;
	submitted_at: string | null;
	rejection_reason: string | null;
	created_at: string;
	updated_at: string;
}

/**
 * Verifica (vía RLS del cliente per-request) que el usuario puede acceder a la
 * incorporación y devuelve su `user_id` dueño. Se usa antes de subir archivos
 * con el cliente admin (service-role), que sí salta RLS.
 */
export async function getIncorporationOwner(
	supabase: SupabaseClient,
	incorporationId: string,
): Promise<{ ownerId: string } | null> {
	const { data, error } = await supabase
		.from('incorporations')
		.select('user_id')
		.eq('id', incorporationId)
		.maybeSingle<{ user_id: string }>();

	if (error) {
		log.error('access check failed', { incorporationId, error });
		return null;
	}
	return data ? { ownerId: data.user_id } : null;
}

export async function getIncorporationForm(
	supabase: SupabaseClient,
	incorporationId: string,
): Promise<IncorporationFormRow | null> {
	const { data, error } = await schema(supabase)
		.from(TABLE)
		.select('*')
		.eq('incorporation_id', incorporationId)
		.maybeSingle<IncorporationFormRow>();

	if (error) {
		log.error('getIncorporationForm', { incorporationId, error });
		return null;
	}
	return data;
}

export interface SaveDraftParams {
	incorporationId: string;
	userId: string;
	payload: unknown;
	progressPercent: number;
	currentStep: string | null;
	/** Si se pasa, el UPDATE solo aplica si la fila tiene este mismo updated_at (optimistic lock). */
	expectedUpdatedAt?: string;
}

/**
 * Guarda (upsert) el borrador. Idempotente sobre `incorporation_id`.
 * No degrada un formulario ya enviado/validado/promovido de vuelta a `draft`:
 * solo escribe si la fila no existe o sigue editable por el cliente.
 */
export async function saveIncorporationFormDraft(
	supabase: SupabaseClient,
	{
		incorporationId,
		userId,
		payload,
		progressPercent,
		currentStep,
		expectedUpdatedAt,
	}: SaveDraftParams,
): Promise<
	| { ok: true; status: IncorporationFormStatus; updatedAt: string }
	| { ok: false; reason: string }
> {
	const now = new Date().toISOString();

	// 1) Intentar actualizar una fila editable (draft | rejected).
	let query = schema(supabase)
		.from(TABLE)
		.update({
			payload,
			progress_percent: progressPercent,
			current_step: currentStep,
			updated_at: now,
		})
		.eq('incorporation_id', incorporationId)
		.in('status', CLIENT_EDITABLE as IncorporationFormStatus[]);

	if (expectedUpdatedAt) {
		query = query.eq('updated_at', expectedUpdatedAt);
	}

	const { data: updated, error: updateError } = await query
		.select('status, updated_at')
		.maybeSingle<{ status: IncorporationFormStatus; updated_at: string }>();

	if (updateError) {
		log.error('saveDraft.update', { incorporationId, error: updateError });
		return { ok: false, reason: updateError.message };
	}
	if (updated) return { ok: true, status: updated.status, updatedAt: updated.updated_at };

	// 2) ¿Existe pero ya no es editable? No tocar.
	const existing = await getIncorporationForm(supabase, incorporationId);
	if (existing) {
		if (expectedUpdatedAt && isClientEditable(existing.status)) {
			return { ok: false, reason: 'CONFLICT' };
		}
		return { ok: true, status: existing.status, updatedAt: existing.updated_at };
	}

	// 3) No existe → insertar borrador nuevo.
	const { data: inserted, error: insertError } = await schema(supabase)
		.from(TABLE)
		.insert({
			incorporation_id: incorporationId,
			user_id: userId,
			payload,
			progress_percent: progressPercent,
			current_step: currentStep,
			form_version: INCORPORATION_FORM_VERSION,
			status: 'draft',
		})
		.select('updated_at')
		.single<{ updated_at: string }>();

	if (insertError) {
		log.error('saveDraft.insert', { incorporationId, error: insertError });
		return { ok: false, reason: insertError.message };
	}
	return { ok: true, status: 'draft', updatedAt: inserted.updated_at };
}

export interface SubmitFormParams {
	incorporationId: string;
	userId: string;
	payload: unknown;
	progressPercent?: number;
}

/**
 * Marca el formulario como `submitted`. La transición es válida SOLO desde un
 * estado editable (`draft` | `rejected`); un formulario ya `submitted`,
 * `in_review`, `validated` o `promoted` NO se sobrescribe — devuelve
 * `{ ok: false, reason: 'NOT_EDITABLE', conflict }` para que el endpoint
 * responda 409 sin pisar el `payload`/`validated_payload` ni el `submitted_at`.
 *
 * El guard se aplica en la propia cláusula `UPDATE … WHERE status IN (editable)`,
 * por lo que la transición es atómica frente a submits concurrentes (no hay
 * ventana TOCTOU). Mismo patrón que `saveIncorporationFormDraft`.
 */
export async function submitIncorporationForm(
	supabase: SupabaseClient,
	{ incorporationId, userId, payload, progressPercent = 100 }: SubmitFormParams,
): Promise<
	| { ok: true }
	| { ok: false; reason: string; conflict?: IncorporationFormStatus }
> {
	const now = new Date().toISOString();

	// 1) Transición atómica editable → submitted.
	const { data: updated, error: updateError } = await schema(supabase)
		.from(TABLE)
		.update({
			payload,
			progress_percent: progressPercent,
			status: 'submitted',
			submitted_at: now,
			updated_at: now,
		})
		.eq('incorporation_id', incorporationId)
		.in('status', CLIENT_EDITABLE as IncorporationFormStatus[])
		.select('status')
		.maybeSingle<{ status: IncorporationFormStatus }>();

	if (updateError) {
		log.error('submitIncorporationForm.update', {
			incorporationId,
			error: updateError,
		});
		return { ok: false, reason: updateError.message };
	}
	if (updated) return { ok: true };

	// 2) La fila existe pero ya no es editable → NO sobrescribir.
	const existing = await getIncorporationForm(supabase, incorporationId);
	if (existing) {
		return { ok: false, reason: 'NOT_EDITABLE', conflict: existing.status };
	}

	// 3) No existe fila previa (submit sin haber guardado draft) → insertar.
	const { error: insertError } = await schema(supabase).from(TABLE).insert({
		incorporation_id: incorporationId,
		user_id: userId,
		payload,
		progress_percent: progressPercent,
		form_version: INCORPORATION_FORM_VERSION,
		status: 'submitted',
		submitted_at: now,
	});

	if (insertError) {
		log.error('submitIncorporationForm.insert', {
			incorporationId,
			error: insertError,
		});
		return { ok: false, reason: insertError.message };
	}
	return { ok: true };
}

const CLIENT_FORM_TASK_TITLE = 'Envío de formulario';
const VALIDATION_TASK_TITLE = 'Validación de datos';

const wfAdmin = supabaseAdmin.schema('workflow' as never);

/**
 * Completa la tarea "Envío de formulario" (rol: client) de la etapa
 * `client_form`. La tarea "Validación de datos" (rol: operations) queda
 * pendiente para que operaciones la revise. Mientras quede alguna tarea
 * pendiente la etapa se mantiene `in_progress`; cuando operaciones valida
 * se completa la etapa y `auto_advance` la avanza.
 *
 * Se llama fire-and-forget tras un submit exitoso.
 */
export async function completeClientFormSubmitTask(
	incorporationId: string,
	userId: string,
): Promise<void> {
	try {
		const { data } = await wfAdmin
			.from('incorporation_tasks')
			.select('id')
			.eq('incorporation_id', incorporationId)
			.eq('title', CLIENT_FORM_TASK_TITLE)
			.in('status', ['pending', 'in_progress'])
			.order('created_at', { ascending: true })
			.limit(1)
			.maybeSingle();

		const taskId = (data as { id?: string } | null)?.id ?? null;
		if (!taskId) {
			log.warn('no pending client submit task found', { incorporationId });
			return;
		}

		const { completeTaskAndAdvance } = await import('@domains/workflow');
		const result = await completeTaskAndAdvance(
			supabaseAdmin,
			taskId,
			userId,
		);
		if (!result.ok) {
			log.error('completeClientFormSubmitTask', { taskId, error: result.error });
		} else {
			log.info('client submit task completed', { taskId, incorporationId, stageCompleted: result.stageCompleted, workflowAdvanced: result.workflowAdvanced });
		}
	} catch (err) {
		log.warn('completeClientFormSubmitTask error', { incorporationId, err });
	}
}

/**
 * Operaciones modifica el payload del formulario: limpia firma y consentimiento,
 * marca como `rejected` para que el cliente revise, firme y acepte de nuevo.
 */
export async function opsEditFormPayload(
	incorporationId: string,
	modifiedPayload: unknown,
): Promise<{ ok: true } | { ok: false; reason: string }> {
	const now = new Date().toISOString();

	const cleaned = modifiedPayload as Record<string, unknown>;
	cleaned.signature = { dataUrl: null, file: null };
	cleaned.consent = { acceptedTerms: false };

	const { data: updated, error: updateError } = await wfAdmin
		.from(TABLE)
		.update({
			payload: cleaned,
			status: 'rejected',
			rejection_reason:
				'Modificado por operaciones — requiere nueva firma y aceptación de términos.',
			updated_at: now,
		})
		.eq('incorporation_id', incorporationId)
		.in('status', ['submitted', 'in_review'] as IncorporationFormStatus[])
		.select('id')
		.maybeSingle();

	if (updateError) {
		log.error('opsEditFormPayload.update', { incorporationId, error: updateError });
		return { ok: false, reason: updateError.message };
	}
	if (!(updated as { id?: string } | null)?.id) {
		return { ok: false, reason: 'NOT_REVIEWABLE' };
	}
	log.info('ops edited form payload', { incorporationId });
	return { ok: true };
}

/**
 * Operaciones valida el formulario: marca la fila como `validated`,
 * completa la tarea "Validación de datos" (que cierra la etapa y auto-avanza).
 */
export async function validateFormByOps(
	incorporationId: string,
	userId: string,
): Promise<{ ok: true } | { ok: false; reason: string }> {
	const now = new Date().toISOString();

	const { data: updated, error: updateError } = await wfAdmin
		.from(TABLE)
		.update({ status: 'validated', updated_at: now })
		.eq('incorporation_id', incorporationId)
		.in('status', ['submitted', 'in_review'] as IncorporationFormStatus[])
		.select('id')
		.maybeSingle();

	if (updateError) {
		log.error('validateFormByOps.update', { incorporationId, error: updateError });
		return { ok: false, reason: updateError.message };
	}
	if (!(updated as { id?: string } | null)?.id) {
		return { ok: false, reason: 'NOT_REVIEWABLE' };
	}

	await completeValidationTask(incorporationId, userId);
	return { ok: true };
}

/**
 * Operaciones rechaza el formulario: lo devuelve a un estado editable
 * para que el cliente corrija.
 */
export async function rejectFormByOps(
	incorporationId: string,
	reason: string,
): Promise<{ ok: true } | { ok: false; reason: string }> {
	const now = new Date().toISOString();

	const { data: updated, error: updateError } = await wfAdmin
		.from(TABLE)
		.update({
			status: 'rejected',
			rejection_reason: reason,
			updated_at: now,
		})
		.eq('incorporation_id', incorporationId)
		.in('status', ['submitted', 'in_review'] as IncorporationFormStatus[])
		.select('id')
		.maybeSingle();

	if (updateError) {
		log.error('rejectFormByOps.update', { incorporationId, error: updateError });
		return { ok: false, reason: updateError.message };
	}
	if (!(updated as { id?: string } | null)?.id) {
		return { ok: false, reason: 'NOT_REVIEWABLE' };
	}
	return { ok: true };
}

async function completeValidationTask(
	incorporationId: string,
	userId: string,
): Promise<void> {
	try {
		const { data } = await wfAdmin
			.from('incorporation_tasks')
			.select('id')
			.eq('incorporation_id', incorporationId)
			.eq('title', VALIDATION_TASK_TITLE)
			.in('status', ['pending', 'in_progress'])
			.order('created_at', { ascending: true })
			.limit(1)
			.maybeSingle();

		const taskId = (data as { id?: string } | null)?.id ?? null;
		if (!taskId) {
			log.warn('no pending validation task found', { incorporationId });
			return;
		}

		const { completeTaskAndAdvance } = await import('@domains/workflow');
		const result = await completeTaskAndAdvance(
			supabaseAdmin,
			taskId,
			userId,
		);
		if (!result.ok) {
			log.error('completeValidationTask', { taskId, error: result.error });
		} else {
			log.info('validation task completed', { taskId, incorporationId, stageCompleted: result.stageCompleted, workflowAdvanced: result.workflowAdvanced });
		}
	} catch (err) {
		log.warn('completeValidationTask error', { incorporationId, err });
	}
}
