import type { SupabaseClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@infrastructure/supabase/admin';
import { createLogger } from '@infrastructure/logging';

const log = createLogger('domains.planning-design-report');
import {
	DocumentsError,
	type DocumentActor,
} from '@domains/documents';
import { generatePdf } from '@integrations/carbone';
import {
	uploadPlanningDocument,
	type UploadPlanningDocumentResult,
} from './planning-meeting-upload';
import {
	deriveTaxClassification,
	TAX_CLASSIFICATION_LABEL,
} from './tax-classification';

/** Plantilla Carbone del informe de planificación y diseño. */
export const PLANNING_REPORT_TEMPLATE = 'planning-design.docx';

export type AdministrationForm = 'member_managed' | 'manager_managed';
export type TaxTributation = 'pass_through' | 'corporation';
export type AccountingMethod = 'cash' | 'accrual';

export interface PlanningDesignReport {
	id: string;
	incorporation_id: string;
	task_id: string | null;
	state_id: number | null;
	activity_id: number | null;
	confidentiality: boolean | null;
	administration_form: AdministrationForm | null;
	tax_tributation: TaxTributation | null;
	accounting_method: AccountingMethod | null;
	members_number: number | null;
	income_us: boolean | null;
	designated_manager: string | null;
	company_description: string | null;
	meeting_resume: string | null;
	created_by: string | null;
	created_at: string;
	updated_at: string;
}

export interface PlanningReportInput {
	incorporationId: string;
	taskId?: string | null;
	stateId?: number | null;
	activityId?: number | null;
	confidentiality?: boolean | null;
	administrationForm?: AdministrationForm | null;
	taxTributation?: TaxTributation | null;
	accountingMethod?: AccountingMethod | null;
	membersNumber?: number | null;
	incomeUs?: boolean | null;
	designatedManager?: string | null;
	companyDescription?: string | null;
	meetingResume?: string | null;
}

const wfAdmin = supabaseAdmin.schema('workflow' as never);

const REPORT_COLUMNS = `id, incorporation_id, task_id, state_id, activity_id,
	confidentiality, administration_form, tax_tributation, accounting_method,
	members_number, income_us, designated_manager, company_description,
	meeting_resume, created_by, created_at, updated_at`;

/** Lee el informe (1:1) de una incorporación con el cliente dado (respeta RLS). */
export const getReportByIncorporation = async (
	supabase: SupabaseClient,
	incorporationId: string,
): Promise<PlanningDesignReport | null> => {
	const { data, error } = await supabase
		.schema('workflow' as never)
		.from('planning_design_reports')
		.select(REPORT_COLUMNS)
		.eq('incorporation_id', incorporationId)
		.maybeSingle();
	if (error) {
		log.error('getReportByIncorporation', { error });
		return null;
	}
	return (data as PlanningDesignReport | null) ?? null;
};

/**
 * Crea o actualiza (upsert por incorporation_id) los datos del informe que
 * Operaciones captura en el wizard. Escribe con service role.
 */
export const upsertReport = async (
	input: PlanningReportInput,
	userId: string | null,
): Promise<PlanningDesignReport> => {
	const payload = {
		incorporation_id: input.incorporationId,
		task_id: input.taskId ?? null,
		state_id: input.stateId ?? null,
		activity_id: input.activityId ?? null,
		confidentiality: input.confidentiality ?? null,
		administration_form: input.administrationForm ?? null,
		tax_tributation: input.taxTributation ?? null,
		accounting_method: input.accountingMethod ?? null,
		members_number: input.membersNumber ?? null,
		income_us: input.incomeUs ?? null,
		designated_manager: input.designatedManager ?? null,
		company_description: input.companyDescription ?? null,
		meeting_resume: input.meetingResume ?? null,
		created_by: userId,
	};

	const { data, error } = await wfAdmin
		.from('planning_design_reports')
		.upsert(payload, { onConflict: 'incorporation_id' })
		.select(REPORT_COLUMNS)
		.single();

	if (error) {
		log.error('upsertReport', { error });
		throw new DocumentsError(500, 'Error guardando los datos del informe');
	}
	return data as PlanningDesignReport;
};

/** Títulos canónicos de las tareas operativas de la etapa planning_meeting. */
export const PLANNING_TASK_SCHEDULE = 'Agendar reunión';
export const PLANNING_TASK_FILL = 'Llenar informe de planificación';
export const PLANNING_TASK_SEND = 'Enviar informe';

/**
 * Resuelve y completa (RPC workflow_complete_task) la tarea pendiente de la
 * etapa de planificación con el título dado. Devuelve el task_id o null.
 */
export const completePlanningTaskByTitle = async (
	incorporationId: string,
	title: string,
	userId: string,
): Promise<string | null> => {
	const { data } = await wfAdmin
		.from('incorporation_tasks')
		.select('id')
		.eq('incorporation_id', incorporationId)
		.eq('title', title)
		.in('status', ['pending', 'in_progress'])
		.order('created_at', { ascending: true })
		.limit(1)
		.maybeSingle();

	const taskId = (data as { id?: string } | null)?.id ?? null;
	if (!taskId) return null;

	const { completeTaskAndAdvance } = await import('@domains/workflow');
	const result = await completeTaskAndAdvance(supabaseAdmin, taskId, userId);
	if (!result.ok) {
		log.error('completePlanningTaskByTitle', { error: result.error });
		return null;
	}
	if (result.stageCompleted) {
		log.info('Stage auto-completed after task', { taskId, title });
	}
	if (result.workflowAdvanced) {
		log.info('Workflow auto-advanced after stage completion', {
			incorporationId,
		});
	}
	return taskId;
};

const ADMIN_FORM_LABEL: Record<AdministrationForm, string> = {
	member_managed: 'Administrada por los miembros',
	manager_managed: 'Administrada por un gerente',
};
const TAX_LABEL: Record<TaxTributation, string> = {
	pass_through: 'Entidad de paso',
	corporation: 'Corporación',
};
const ACCOUNTING_LABEL: Record<AccountingMethod, string> = {
	cash: 'Efectivo (cash)',
	accrual: 'Devengado (accrual)',
};

/** Datos resueltos desde otras tablas para inyectar en la plantilla. */
export interface ReportTemplateExtras {
	/** Nombre de la empresa (incorporations.principal_name). */
	companyName?: string | null;
	/** Nombre del contacto/cliente dueño de la incorporación. */
	contactName?: string | null;
	/** Nombre del estado de incorporación (states.name desde report.state_id). */
	stateName?: string | null;
	/** Código NAICS/IRS de la actividad (activity.irs_code desde activity_id). */
	activityCode?: string | null;
	/** Nombre legible de la actividad (activity.name_es). */
	activityName?: string | null;
}

/**
 * Construye el payload plano para la plantilla Carbone `planning-design.docx`.
 * Las claves coinciden 1:1 con los marcadores `{d.*}` de esa plantilla.
 *
 * Nota: `state_fee` y `fee_cycle` aún no tienen fuente de datos (no existe
 * tabla de franchise fees por estado) — se emiten vacíos por ahora.
 */
export const buildTemplateData = (
	report: PlanningDesignReport,
	extras: ReportTemplateExtras = {},
): Record<string, unknown> => {
	// Clasificación fiscal IRS: pass_through + 1 socio ⇒ disregarded entity,
	// + 2 socios ⇒ partnership, corporación ⇒ corporation.
	const classification = deriveTaxClassification(
		report.tax_tributation,
		report.members_number,
	);
	const taxBase = report.tax_tributation
		? TAX_LABEL[report.tax_tributation]
		: '';
	// Combina sistema tributario + clasificación IRS en un solo texto, p.ej.
	// "Entidad de paso (Disregarded entity)".
	const taxactionType = classification
		? `${taxBase} (${TAX_CLASSIFICATION_LABEL[classification]})`
		: taxBase;

	return {
		client_name: extras.companyName ?? '',
		contact_name: extras.contactName ?? '',
		created_date: new Date().toLocaleDateString('es-EC'),
		pd_meeting_resume: report.meeting_resume ?? '',
		state: extras.stateName ?? '',
		privacy: report.confidentiality ? 'Sí' : 'No',
		administration_form: report.administration_form
			? ADMIN_FORM_LABEL[report.administration_form]
			: '',
		total_members: report.members_number ?? '',
		taxaction_type: taxactionType,
		accounting_method: report.accounting_method
			? ACCOUNTING_LABEL[report.accounting_method]
			: '',
		activity_code: extras.activityCode ?? '',
		description: extras.activityName || report.company_description || '',
		// Sin fuente de datos todavía (franchise fee por estado):
		state_fee: '',
		fee_cycle: '',
		// Claves extra disponibles por si se agregan marcadores a la plantilla:
		tax_classification: classification
			? TAX_CLASSIFICATION_LABEL[classification]
			: '',
		company_description: report.company_description ?? '',
		income_us: report.income_us ? 'Sí' : 'No',
		designated_manager: report.designated_manager ?? '',
	};
};

/**
 * Genera el PDF del informe desde la plantilla con los datos guardados y lo
 * sube compartido con el cliente (sin aprobación). Reutiliza el
 * versionado de `uploadPlanningDocument`.
 */
export const generateAndUploadReport = async (
	actor: DocumentActor,
	incorporationId: string,
): Promise<UploadPlanningDocumentResult> => {
	if (!actor.isStaff) {
		throw new DocumentsError(403, 'Solo operaciones puede generar este informe');
	}

	const report = await getReportByIncorporation(supabaseAdmin as never, incorporationId);
	if (!report) {
		throw new DocumentsError(400, 'No hay datos del informe para generar el PDF');
	}

	const { data: empresa } = await supabaseAdmin
		.from('incorporations')
		.select('principal_name, usuarios:user_id ( nombre, apellido )')
		.eq('id', incorporationId)
		.maybeSingle();

	const empresaRow = empresa as {
		principal_name?: string | null;
		usuarios?:
			| { nombre?: string | null; apellido?: string | null }
			| { nombre?: string | null; apellido?: string | null }[]
			| null;
	} | null;

	const companyName = empresaRow?.principal_name ?? 'Empresa';

	// El embed puede venir como objeto (to-one) o array según supabase-js.
	const usuario = Array.isArray(empresaRow?.usuarios)
		? empresaRow?.usuarios[0]
		: empresaRow?.usuarios;
	const contactName = usuario
		? `${usuario.nombre ?? ''} ${usuario.apellido ?? ''}`.trim()
		: '';

	// Nombre del estado de incorporación (report.state_id → states).
	let stateName = '';
	if (report.state_id != null) {
		const { data: st } = await supabaseAdmin
			.from('states')
			.select('name')
			.eq('id', report.state_id)
			.maybeSingle();
		stateName = (st as { name?: string | null } | null)?.name ?? '';
	}

	// Código NAICS/IRS y nombre de la actividad (report.activity_id → activity).
	let activityCode = '';
	let activityName = '';
	if (report.activity_id != null) {
		const { data: act } = await supabaseAdmin
			.from('activity')
			.select('irs_code, name_es')
			.eq('id', report.activity_id)
			.maybeSingle();
		const actRow = act as {
			irs_code?: string | null;
			name_es?: string | null;
		} | null;
		activityCode = actRow?.irs_code ?? '';
		activityName = actRow?.name_es ?? '';
	}

	const data = buildTemplateData(report, {
		companyName,
		contactName,
		stateName,
		activityCode,
		activityName,
	});

	const safeName = companyName.replace(/[^\w\d-]+/g, '_').slice(0, 60);
	const reportName = `Planificacion-${safeName}`;

	const pdfBuffer = await generatePdf({
		templatePath: PLANNING_REPORT_TEMPLATE,
		reportName,
		data,
	});

	const file = new File([new Uint8Array(pdfBuffer)], `${reportName}.pdf`, {
		type: 'application/pdf',
	});

	return uploadPlanningDocument(actor, {
		caseId: incorporationId,
		file,
		notes: 'Informe de planificación y diseño generado automáticamente.',
	});
};
