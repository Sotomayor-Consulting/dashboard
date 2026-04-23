import { SupabaseClient } from '@supabase/supabase-js';
import type { IncorporationRow } from '../types';

type WorkflowRow = {
	incorporation_id: string;
	status: IncorporationRow['workflow_status'];
	created_at: string | null;
	updated_at: string | null;
	current_stage:
		| {
				slug: string | null;
				name: string | null;
		  }
		| {
				slug: string | null;
				name: string | null;
		  }[]
		| null;
};

const normalizeStage = (currentStage: WorkflowRow['current_stage']) => {
	if (!currentStage) return null;
	if (Array.isArray(currentStage)) return currentStage[0] ?? null;
	return currentStage;
};

const listIncorporationRows = async (
	supabase: SupabaseClient,
): Promise<IncorporationRow[]> => {
	const [{ data: empresas, error: empresasError }, { data: workflows, error: workflowsError }] =
		await Promise.all([
			supabase
				.from('empresas_incorporaciones')
				.select(
					`empresa_incorporacion_id, user_id, nombre_1, nombre_2, nombre_3, tipo_de_negocio, estado_de_incorporacion, estado, created_at, updated_at`,
				)
				.order('updated_at', { ascending: false }),
			supabase
				.schema('workflow' as never)
				.from('incorporation_workflows')
				.select(
					`incorporation_id, status, created_at, updated_at, current_stage:current_stage_id ( slug, name )`,
				),
		]);

	if (empresasError) throw empresasError;
	if (workflowsError) throw workflowsError;

	const workflowsMap = new Map<string, WorkflowRow>();
	for (const workflow of (workflows ?? []) as WorkflowRow[]) {
		workflowsMap.set(workflow.incorporation_id, workflow);
	}

	return (empresas ?? []).map((empresa) => {
		const workflow = workflowsMap.get(empresa.empresa_incorporacion_id);
		const stage = normalizeStage(workflow?.current_stage ?? null);

		return {
			id: workflow?.incorporation_id ?? empresa.empresa_incorporacion_id,
			incorporation_id: empresa.empresa_incorporacion_id,
			user_id: empresa.user_id,
			possible_names: [
				empresa.nombre_1 ?? '',
				empresa.nombre_2 ?? '',
				empresa.nombre_3 ?? '',
			],
			business_type: empresa.tipo_de_negocio,
			state_of_incorporation: empresa.estado_de_incorporacion,
			company_status: empresa.estado,
			workflow_status: workflow?.status ?? null,
			current_stage_slug: stage?.slug ?? null,
			current_stage_name: stage?.name ?? null,
			created_at: workflow?.created_at ?? empresa.created_at ?? null,
			updated_at: workflow?.updated_at ?? empresa.updated_at ?? null,
		};
	});
};

export const getIncorporations = async (
	supabase: SupabaseClient,
	): Promise<IncorporationRow[]> => {
	return listIncorporationRows(supabase);
};

export const getIncorporationsWithCompanies = async (
	supabase: SupabaseClient,
) => {
	return listIncorporationRows(supabase);
};
