import type { SupabaseClient } from '@supabase/supabase-js';

export interface State {
	id: number;
	name: string;
	code: string;
}

export const getUsStates = async (
	supabase: SupabaseClient,
): Promise<State[]> => {
	const { data: country, error: countryError } = await supabase
		.from('countries')
		.select('id')
		.eq('iso', 'US')
		.maybeSingle<{ id: number }>();

	if (countryError || !country) {
		console.error('Error obteniendo pais US:', countryError);
		return [];
	}

	const { data: states, error } = await supabase
		.from('states')
		.select('id, name, code')
		.eq('country_id', country.id)
		.order('name', { ascending: true });

	if (error) {
		console.error('Error obteniendo estados:', error);
		return [];
	}

	return states ?? [];
};
