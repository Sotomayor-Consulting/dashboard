import { supabase } from '@lib/supabase';
import type { User } from '@supabase/supabase-js';

export const getIncorporacionesByUserId = async (userId: string) => {
	const { data, error } = await supabase
		.from('empresas_incorporaciones')
		.select('*')
		.eq('user_id', userId);

	if (error) {
		console.error('Error fetching incorporaciones by user ID:', error);
		return [];
	}

	return data;
};

export const getIncorporacionById = async (id: string, userId: string) => {
	const { data, error } = await supabase
		.from('empresas_incorporaciones')
		.select('*')
		.eq('empresa_incorporacion_id', id)
		.eq('user_id', userId)
		.single();
	if (error) {
		console.error('Error fetching incorporaciones by ID:', error);
		return [];
	}

	return data;
};

export const getIncorporacionesEnProceso = async (userId: string) => {
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
		.eq('estado', 'En proceso')
		.order('updated_at', { ascending: true });
	if (error) {
		console.error(
			'Error fetching incorporaciones en proceso por user ID:',
			error,
		);
		return [];
	}

	return data;
};

export const IncorporacionesEmpresasBase = async () => {
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
		console.error('Error fetching incorporaciones base:', error);
		return [];
	}
	return data;
};

export const getEstadoIncorporacionByUserId = async (userId: string) => {
	const { data, error } = await supabase
		.from('empresas_incorporaciones')
		.select('estado')
		.eq('user_id', userId);

	if (error) {
		console.error('Error fetching estado incorporacion by user ID:', error);
		return [];
	}

	return data;
};

export const getUserWithSession = async (
	accessToken: string | undefined,
	refreshToken: string | undefined,
): Promise<{ user: User | null; error: Error | null }> => {
	if (!accessToken || !refreshToken) {
		return { user: null, error: null };
	}

	try {
		await supabase.auth.setSession({
			refresh_token: refreshToken,
			access_token: accessToken,
		});

		const {
			data: { user },
			error,
		} = await supabase.auth.getUser();

		if (error) {
			console.error('[Banner] Error getting user:', error);
			return { user: null, error };
		}

		return { user, error: null };
	} catch (e) {
		console.error('[Banner] Error de sesión:', e);
		return { user: null, error: e as Error };
	}
};

export const getUser = async (): Promise<{
	user: User | null;
	error: Error | null;
}> => {
	try {
		const {
			data: { user },
			error,
		} = await supabase.auth.getUser();

		if (error) {
			return { user: null, error };
		}

		return { user, error: null };
	} catch (e) {
		return { user: null, error: e as Error };
	}
};

export const checkUserIncorporacionesEnProceso = async (
	user: User | null,
): Promise<boolean> => {
	if (!user) return false;

	const incorporaciones = await getEstadoIncorporacionByUserId(user.id);

	if (!incorporaciones || incorporaciones.length === 0) return false;

	return incorporaciones.some((c) => c.estado === 'En proceso');
};

export interface BannerIncorporacionData {
	shouldShow: boolean;
	empresaId: string | null;
}

export const getBannerIncorporacionData = async (
	userId: string,
): Promise<BannerIncorporacionData> => {
	const { data: empresaActiva } = await supabase
		.from('empresas_incorporaciones')
		.select('empresa_incorporacion_id')
		.eq('user_id', userId)
		.eq('estado', 'Activo')
		.maybeSingle();

	const { data: formularioEnviado } = await supabase
		.from('formularios_envios')
		.select('status')
		.eq('user_id', userId)
		.eq('status', 'submitted')
		.maybeSingle();

	const shouldShow = !!empresaActiva && !formularioEnviado;

	return {
		shouldShow,
		empresaId: empresaActiva?.empresa_incorporacion_id || null,
	};
};
