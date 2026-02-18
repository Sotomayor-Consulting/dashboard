import { supabase } from '@lib/supabase';
import type { User } from '@supabase/supabase-js';

export const getIncorporacionesByUserId = async (userId: string) => {
	const { data, error } = await supabase
		.from('empresas_incorporaciones')
		.select('*')
		.eq('user_id', userId);

	if (error) {
		console.error('Error fetching incorporaciones by user ID:', error);
		throw error;
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
		throw error;
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

export const getUser = async (): Promise<{ user: User | null; error: Error | null }> => {
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
