import type { SupabaseClient } from '@supabase/supabase-js';
import { generatePdf } from '@lib/carbone';
import { completeTask } from '@lib/tablas/workflow';

const BUCKET = 'documentos_empresas';

interface TemplateSpec {
	templateFile: string;
	documentTypeCode: number;
	reportName: string;
}

const TEMPLATE_MAP: Record<string, TemplateSpec> = {
	'Artículos de incorporación': {
		templateFile: 'complejo.docx',
		documentTypeCode: 1001,
		reportName: 'articles_of_organization',
	},
	'Elaborar Operation Agreement': {
		templateFile: 'template.docx',
		documentTypeCode: 1002,
		reportName: 'operating_agreement',
	},
};

interface GeneratedDocument {
	taskId: string;
	taskTitle: string;
	documentId: string | null;
	bucketPath: string | null;
	status: 'generated' | 'skipped' | 'error';
	error?: string;
}

interface GenerateResult {
	incorporationId: string;
	documents: GeneratedDocument[];
}

export const generateIncorporationDocuments = async (
	supabase: SupabaseClient,
	incorporationId: string,
	actorUserId: string,
): Promise<GenerateResult> => {
	const empresa = await loadEmpresaData(supabase, incorporationId);
	if (!empresa) {
		throw new Error(`Empresa ${incorporationId} no encontrada`);
	}

	const tasks = await loadDocumentGenerationTasks(supabase, incorporationId);

	const typeCodeToId = await loadDocumentTypeIds(supabase);

	const results: GeneratedDocument[] = [];

	for (const task of tasks) {
		const spec = TEMPLATE_MAP[task.title];
		if (!spec) {
			results.push({
				taskId: task.id,
				taskTitle: task.title,
				documentId: null,
				bucketPath: null,
				status: 'skipped',
				error: 'sin mapping de template',
			});
			continue;
		}

		const documentTypeId = typeCodeToId.get(spec.documentTypeCode);
		if (!documentTypeId) {
			results.push({
				taskId: task.id,
				taskTitle: task.title,
				documentId: null,
				bucketPath: null,
				status: 'error',
				error: `document_type code ${spec.documentTypeCode} no seedeado`,
			});
			continue;
		}

		try {
			const pdf = await generatePdf({
				templateName: spec.templateFile,
				data: buildTemplateData(empresa),
				reportName: spec.reportName,
			});

			const fileName = `${spec.reportName}_${Date.now()}.pdf`;
			const bucketPath = `${incorporationId}/generated/${fileName}`;

			const { error: uploadError } = await supabase.storage
				.from(BUCKET)
				.upload(bucketPath, pdf, {
					contentType: 'application/pdf',
					upsert: false,
				});
			if (uploadError) throw new Error(`upload: ${uploadError.message}`);

			const { data: docRow, error: insertError } = await supabase
				.schema('documents' as never)
				.from('documents')
				.insert({
					case_id: incorporationId,
					document_type_id: documentTypeId,
					file_name: fileName,
					file_title: spec.reportName,
					bucket_storage: BUCKET,
					bucket_path: bucketPath,
					mime_type: 'application/pdf',
					file_size_bytes: pdf.byteLength,
					status: 'uploaded',
					visibility: 'internal_only',
					is_sensitive: true,
					uploaded_by: actorUserId,
					created_by: actorUserId,
				})
				.select('id')
				.single();
			if (insertError || !docRow) {
				throw new Error(
					`insert documents: ${insertError?.message ?? 'sin id'}`,
				);
			}

			await supabase
				.schema('documents' as never)
				.from('document_links')
				.insert([
					{
						document_id: docRow.id,
						related_to_type: 'incorporation_case',
						related_to_id: incorporationId,
						relation_purpose: 'owner',
						is_primary: true,
						created_by: actorUserId,
					},
					{
						document_id: docRow.id,
						related_to_type: 'workflow',
						related_to_id: task.id,
						relation_purpose: 'filing',
						is_primary: false,
						created_by: actorUserId,
					},
				]);

			await completeTask(supabase, task.id, actorUserId);

			results.push({
				taskId: task.id,
				taskTitle: task.title,
				documentId: docRow.id as string,
				bucketPath,
				status: 'generated',
			});
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			console.error(`[documentGeneration] task ${task.id}:`, message);
			results.push({
				taskId: task.id,
				taskTitle: task.title,
				documentId: null,
				bucketPath: null,
				status: 'error',
				error: message,
			});
		}
	}

	return { incorporationId, documents: results };
};

// ─── helpers internos ─────────────────────────────────────────

interface EmpresaData {
	empresa_incorporacion_id: string;
	user_id: string;
	nombre_1: string | null;
	nombre_2: string | null;
	nombre_3: string | null;
	tipo_de_negocio: string | null;
	estado_de_incorporacion: string | null;
	direccion_empresa: string | null;
	direccion_eeuu: string | null;
	ciudad_eeuu: string | null;
	estado_eeuu: string | null;
	codigo_postal_eeuu: number | null;
	actividad: string | null;
	forma_administracion: string | null;
	forma_tributacion: string | null;
	responsable_irs: string | null;
	socios?: unknown[];
	managers?: unknown[];
}

const loadEmpresaData = async (
	supabase: SupabaseClient,
	incorporationId: string,
): Promise<EmpresaData | null> => {
	const { data: empresa, error } = await supabase
		.from('empresas_incorporaciones')
		.select('*')
		.eq('empresa_incorporacion_id', incorporationId)
		.maybeSingle();
	if (error || !empresa) return null;

	const [{ data: socios }, { data: managers }] = await Promise.all([
		supabase
			.from('socios_validados')
			.select('*')
			.eq('id_empresa', incorporationId),
		supabase
			.from('managers_validados')
			.select('*')
			.eq('empresa_incorporacion_id', incorporationId),
	]);

	return {
		...(empresa as EmpresaData),
		socios: socios ?? [],
		managers: managers ?? [],
	};
};

interface PendingTask {
	id: string;
	title: string;
}

const loadDocumentGenerationTasks = async (
	supabase: SupabaseClient,
	incorporationId: string,
): Promise<PendingTask[]> => {
	const { data, error } = await supabase
		.schema('workflow' as never)
		.from('incorporation_tasks')
		.select(
			`id, title, status,
			stage:workflow_stage_id!inner (
				catalog:stage_id!inner ( slug )
			)`,
		)
		.eq('incorporation_id', incorporationId)
		.in('stage.catalog.slug', ['state_registration', 'fiscal_documents'])
		.in('status', ['pending', 'in_progress']);

	if (error) {
		console.error('loadDocumentGenerationTasks:', error);
		return [];
	}
	return (data ?? []).map((t: { id: string; title: string }) => ({
		id: t.id,
		title: t.title,
	}));
};

const loadDocumentTypeIds = async (
	supabase: SupabaseClient,
): Promise<Map<number, number>> => {
	const { data, error } = await supabase
		.schema('documents' as never)
		.from('document_types')
		.select('id, code')
		.in('code', [1001, 1002]);
	if (error || !data) return new Map();
	return new Map(data.map((r: { id: number; code: number }) => [r.code, r.id]));
};

const buildTemplateData = (e: EmpresaData): Record<string, unknown> => ({
	empresa: {
		nombre: e.nombre_1 ?? '',
		nombre_alt_1: e.nombre_2 ?? '',
		nombre_alt_2: e.nombre_3 ?? '',
		tipo_de_negocio: e.tipo_de_negocio ?? '',
		estado: e.estado_de_incorporacion ?? '',
		direccion: e.direccion_empresa ?? e.direccion_eeuu ?? '',
		ciudad: e.ciudad_eeuu ?? '',
		codigo_postal: e.codigo_postal_eeuu ?? '',
		actividad: e.actividad ?? '',
		forma_administracion: e.forma_administracion ?? '',
		forma_tributacion: e.forma_tributacion ?? '',
		responsable_irs: e.responsable_irs ?? '',
	},
	socios: e.socios ?? [],
	managers: e.managers ?? [],
	generated_at: new Date().toISOString(),
});
