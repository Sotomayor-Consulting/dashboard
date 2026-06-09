import type { SupabaseClient } from '@supabase/supabase-js';
import { createLogger } from '@infrastructure/logging';

const log = createLogger('domains.countries-list');

export const PaisesGeneral = async (supabase: SupabaseClient) => {
	const { data, error } = await supabase
		.from('countries')
		.select('*')
		.order('name', { ascending: true });

	if (error) {
		log.error('Error fetching all countries', { error });
		throw error;
	}

	return data;
};
