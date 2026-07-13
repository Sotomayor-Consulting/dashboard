export const prerender = false;

import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '@infrastructure/supabase';
import { resolveDocumentActor, DocumentsError } from '@domains/documents';
import {
	upsertReport,
	completePlanningTaskByTitle,
	PLANNING_TASK_FILL,
	type PlanningReportInput,
	type AdministrationForm,
	type TaxTributation,
	type AccountingMethod,
} from '@domains/workflow/stages/planning-design-report';
import { SECURITY_HEADERS } from '@infrastructure/security/headers';
import { createLogger } from '@infrastructure/logging';

const log = createLogger('planning.report');

const json = (status: number, payload: unknown) =>
	new Response(JSON.stringify(payload), { status, headers: SECURITY_HEADERS });

const ADMIN_FORMS: AdministrationForm[] = ['member_managed', 'manager_managed'];
const TAX_OPTS: TaxTributation[] = ['pass_through', 'corporation'];
const ACCOUNTING_OPTS: AccountingMethod[] = ['cash', 'accrual'];

const enumOrNull = <T extends string>(value: unknown, allowed: T[]): T | null =>
	typeof value === 'string' && allowed.includes(value as T) ? (value as T) : null;

const boolOrNull = (v: unknown): boolean | null =>
	typeof v === 'boolean' ? v : null;

const intOrNull = (v: unknown): number | null =>
	typeof v === 'number' && Number.isFinite(v) ? Math.trunc(v) : null;

const strOrNull = (v: unknown): string | null =>
	typeof v === 'string' && v.trim() ? v.trim() : null;

export const POST: APIRoute = async ({ request, cookies, locals }) => {
	const supabase = createSupabaseServerClient({
		headers: request.headers,
		cookies,
	});

	const {
		data: { user },
		error: authError,
	} = await supabase.auth.getUser();
	if (authError || !user) {
		return json(401, { ok: false, error: 'NO_AUTH_USER' });
	}

	const actor = await resolveDocumentActor(supabase, locals.userRoles ?? []);
	if (!actor.isStaff) {
		return json(403, { ok: false, error: 'FORBIDDEN' });
	}

	const body = await request.json().catch(() => null);
	const incorporationId = strOrNull(body?.incorporationId);
	if (!incorporationId) {
		return json(400, { ok: false, error: 'MISSING_INCORPORATION_ID' });
	}

	const input: PlanningReportInput = {
		incorporationId,
		taskId: strOrNull(body?.taskId),
		stateId: intOrNull(body?.stateId),
		activityId: intOrNull(body?.activityId),
		confidentiality: boolOrNull(body?.confidentiality),
		administrationForm: enumOrNull(body?.administrationForm, ADMIN_FORMS),
		taxTributation: enumOrNull(body?.taxTributation, TAX_OPTS),
		accountingMethod: enumOrNull(body?.accountingMethod, ACCOUNTING_OPTS),
		membersNumber: intOrNull(body?.membersNumber),
		incomeUs: boolOrNull(body?.incomeUs),
		designatedManager: strOrNull(body?.designatedManager),
		companyDescription: strOrNull(body?.companyDescription),
		meetingResume: strOrNull(body?.meetingResume),
	};

	try {
		const report = await upsertReport(input, user.id);

		// Completa la tarea "Llenar informe" (opcional: no bloquea el guardado).
		const completed = await completePlanningTaskByTitle(
			incorporationId,
			PLANNING_TASK_FILL,
			user.id,
		);

		return json(200, { ok: true, report, taskCompleted: completed });
	} catch (error) {
		if (error instanceof DocumentsError) {
			return json(error.status, { ok: false, error: error.message });
		}
		log.error('Unexpected error', { error });
		return json(500, { ok: false, error: 'UNEXPECTED_ERROR' });
	}
};
