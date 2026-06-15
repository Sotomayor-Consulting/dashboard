// Acceso a datos del staging del formulario de incorporación.
//
// Tabla: workflow.incorporation_forms (1:1 con empresas_incorporaciones).
// Flujo de estado: draft → submitted → in_review → validated → rejected → promoted.
// Este módulo solo cubre el lado del cliente (draft + submit). La promoción a
// tablas canónicas (companies/members/company_members) vive en operaciones.

import type { SupabaseClient } from '@supabase/supabase-js';
import { createLogger } from '@infrastructure/logging';

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
		.from('empresas_incorporaciones')
		.select('user_id')
		.eq('empresa_incorporacion_id', incorporationId)
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
	}: SaveDraftParams,
): Promise<
	{ ok: true; status: IncorporationFormStatus } | { ok: false; reason: string }
> {
	const now = new Date().toISOString();

	// 1) Intentar actualizar una fila editable (draft | rejected).
	const { data: updated, error: updateError } = await schema(supabase)
		.from(TABLE)
		.update({
			payload,
			progress_percent: progressPercent,
			current_step: currentStep,
			updated_at: now,
		})
		.eq('incorporation_id', incorporationId)
		.in('status', CLIENT_EDITABLE as IncorporationFormStatus[])
		.select('status')
		.maybeSingle<{ status: IncorporationFormStatus }>();

	if (updateError) {
		log.error('saveDraft.update', { incorporationId, error: updateError });
		return { ok: false, reason: updateError.message };
	}
	if (updated) return { ok: true, status: updated.status };

	// 2) ¿Existe pero ya no es editable? No tocar.
	const existing = await getIncorporationForm(supabase, incorporationId);
	if (existing) return { ok: true, status: existing.status };

	// 3) No existe → insertar borrador nuevo.
	const { error: insertError } = await schema(supabase).from(TABLE).insert({
		incorporation_id: incorporationId,
		user_id: userId,
		payload,
		progress_percent: progressPercent,
		current_step: currentStep,
		status: 'draft',
	});

	if (insertError) {
		log.error('saveDraft.insert', { incorporationId, error: insertError });
		return { ok: false, reason: insertError.message };
	}
	return { ok: true, status: 'draft' };
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
