import type { SupabaseClient } from '@supabase/supabase-js';
import type { User } from '@supabase/supabase-js';
import { createLogger } from '@infrastructure/logging';

const log = createLogger('domains.incorporations');

export const getIncorporacionesByUserId = async (
	supabase: SupabaseClient,
	userId: string,
) => {
	const { data, error } = await supabase
		.from('empresas_incorporaciones')
		.select('*')
		.eq('user_id', userId);

	if (error) {
		log.error('Error fetching incorporaciones by user ID', { error });
		return [];
	}

	return data;
};

export const getIncorporacionById = async (
	supabase: SupabaseClient,
	id: string,
	userId: string,
) => {
	const { data, error } = await supabase
		.from('empresas_incorporaciones')
		.select('*')
		.eq('empresa_incorporacion_id', id)
		.eq('user_id', userId)
		.maybeSingle();
	if (error) {
		log.error('Error fetching incorporaciones by ID', { error });
		return null;
	}

	return data;
};

/** Busca una empresa por ID sin filtrar por user_id — solo para vistas admin */
export const getIncorporacionByIdAdmin = async (
	supabase: SupabaseClient,
	id: string,
) => {
	const { data, error } = await supabase
		.from('empresas_incorporaciones')
		.select('*')
		.eq('empresa_incorporacion_id', id)
		.single();
	if (error) {
		log.error('Error fetching incorporacion by ID (admin)', { error });
		return null;
	}

	return data;
};

export const getIncorporacionesEnProceso = async (
	supabase: SupabaseClient,
	userId: string,
) => {
	const { data, error } = await supabase
		.from('empresas_incorporaciones')
		.select(
			`
					user_id,
					empresa_incorporacion_id,
					tipo_de_negocio,
					estado_de_incorporacion,
					estado,
					nombre_1,
					nombre_2,
					nombre_3,
					updated_at
				`,
		)
		.eq('user_id', userId)
		.in('estado', ['En proceso', 'Upgrade'])
		.order('updated_at', { ascending: true });
	if (error) {
		log.error('Error fetching incorporaciones en proceso por user ID', {
			error,
		});
		return [];
	}

	return data;
};

export const getIncorporacionesUpgrade = async (
	supabase: SupabaseClient,
	userId: string,
) => {
	const { data, error } = await supabase
		.from('empresas_incorporaciones')
		.select(
			`
					user_id,
					empresa_incorporacion_id,
					tipo_de_negocio,
					estado_de_incorporacion,
					estado,
					nombre_1,
					nombre_2,
					nombre_3,
					updated_at
				`,
		)
		.eq('user_id', userId)
		.eq('estado', 'Upgrade')
		.order('updated_at', { ascending: true });
	if (error) {
		log.error('Error fetching incorporaciones en proceso por user ID', {
			error,
		});
		return [];
	}

	return data;
};

export const IncorporacionesEmpresasBase = async (supabase: SupabaseClient) => {
	const { data, error } = await supabase
		.from('empresas_incorporaciones')
		.select(
			`
    user_id,
    empresa_incorporacion_id,
    tipo_de_negocio,
    estado_de_incorporacion,
    estado,
    nombre_1,
    nombre_2,
    nombre_3,
    updated_at,
	porcentaje_de_incorporacion,
    usuarios:user_id (nombre, apellido)
  `,
			{ count: 'exact' },
		)
		.order('updated_at', { ascending: false });

	if (error) {
		log.error('Error fetching incorporaciones base', { error });
		return [];
	}
	return data;
};

export const getEstadoIncorporacionByUserId = async (
	supabase: SupabaseClient,
	userId: string,
) => {
	const { data, error } = await supabase
		.from('empresas_incorporaciones')
		.select('estado')
		.eq('user_id', userId);

	if (error) {
		log.error('Error fetching estado incorporacion by user ID', { error });
		return [];
	}

	return data;
};

export const checkUserIncorporacionesEnProceso = async (
	supabase: SupabaseClient,
	user: User | null,
): Promise<boolean> => {
	if (!user) return false;

	const incorporaciones = await getEstadoIncorporacionByUserId(
		supabase,
		user.id,
	);

	if (!incorporaciones || incorporaciones.length === 0) return false;

	return incorporaciones.some((c) => c.estado === 'En proceso');
};

