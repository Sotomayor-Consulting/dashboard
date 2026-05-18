import type { SupabaseClient } from '@supabase/supabase-js'

export interface State {
	id: number;
	name: string;
	code: string;
};

export const getUsStates = async (
	supabase: SupabaseClient,
): Promise<State[]> => {
	const { data: states, error } = await supabase
		.from('states')
		.select('id, name, code')
		.eq('country_id', 75)

	if (error) {
		console.error('Error obteniendo estados:', error);
		return [];
	}

	return states ?? [];
};
