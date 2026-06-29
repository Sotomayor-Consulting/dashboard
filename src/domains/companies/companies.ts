import type { SupabaseClient } from '@supabase/supabase-js';

export const getEmpresaById = async (
	supabase: SupabaseClient,
	empresaId: string,
) => {
	const { data: empresa, error } = await supabase
		.from('incorporations')
		.select(
			`
    *,
    usuarios:user_id (nombre, apellido, correo)
  `,
		)
		.eq('id', empresaId)
		.single();

	if (error || !empresa) {
		return null;
	}

	return empresa;
};

export const getEmpresasGenenralById = async (
	supabase: SupabaseClient,
	userId: string,
) => {
	const { data: empresas, error } = await supabase
		.from('incorporations')
		.select('*')
		.eq('user_id', userId)
		.order('updated_at', { ascending: true });
	if (error || !empresas) {
		return null;
	}

	return empresas;
};

export interface EmpresaSwitcherItem {
	id: string;
	nombre: string;
	tipo_de_negocio: string | null;
	estado: string | null;
	estado_de_incorporacion: string | null;
}

export const getEmpresasForSwitcher = async (
	supabase: SupabaseClient,
	userId: string,
): Promise<EmpresaSwitcherItem[]> => {
	const { data, error } = await supabase
		.from('incorporations')
		.select(
			'id, principal_name, possible_names, entity_type, state, formation_state_id, updated_at, formation_state:formation_state_id ( name )',
		)
		.eq('user_id', userId)
		.order('updated_at', { ascending: false });

	if (error || !data) return [];

	return data.map((e: any) => {
		const stateRow = e.formation_state as { name: string } | null;
		return {
			id: e.id as string,
			nombre:
				(e.principal_name as string) ||
				((e.possible_names as string[] | null)?.find(Boolean) as string) ||
				'Empresa sin nombre',
			tipo_de_negocio: (e.entity_type as string) ?? null,
			estado: (e.state as string) ?? null,
			estado_de_incorporacion: stateRow?.name ?? null,
		};
	});
};

export const resolveActiveCompany = (
	empresas: EmpresaSwitcherItem[],
	cookieValue: string | undefined,
): EmpresaSwitcherItem | null => {
	if (empresas.length === 0) return null;
	if (cookieValue) {
		const match = empresas.find((e) => e.id === cookieValue);
		if (match) return match;
	}
	return empresas[0] ?? null;
};
