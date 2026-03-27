import type { SupabaseClient } from '@supabase/supabase-js';

export const getEmpresaById = async (
	supabase: SupabaseClient,
	empresaId: string,
) => {
	const { data: empresa, error } = await supabase
		.from('empresas_incorporaciones')
		.select(
			`
    *,
    usuarios:user_id (nombre, apellido, correo)
  `,
		)
		.eq('empresa_incorporacion_id', empresaId)
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
		.from('empresas_incorporaciones')
		.select('*')
		.eq('user_id', userId)
		.order('updated_at', { ascending: true });
	if (error || !empresas) {
		return null;
	}

	return empresas;
};
