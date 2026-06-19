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
			'id, principal_name, possible_names, tipo_de_negocio, estado, estado_de_incorporacion, updated_at',
		)
		.eq('user_id', userId)
		.order('updated_at', { ascending: false });

	if (error || !data) return [];

	return data.map((e: any) => ({
		id: e.id as string,
		nombre:
			(e.principal_name as string) ||
			((e.possible_names as string[] | null)?.find(Boolean) as string) ||
			'Empresa sin nombre',
		tipo_de_negocio: (e.tipo_de_negocio as string) ?? null,
		estado: (e.estado as string) ?? null,
		estado_de_incorporacion:
			(e.estado_de_incorporacion as string) ?? null,
	}));
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
