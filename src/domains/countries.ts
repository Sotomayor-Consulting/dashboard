import type { SupabaseClient } from '@supabase/supabase-js';
import type { Country } from '@modules/companies/types';
import { createLogger } from '@infrastructure/logging';

const log = createLogger('domains.countries');

export const getCountries = async (supabase: SupabaseClient) => {
	const { data, error } = await supabase
		.from('countries')
		.select('*')
		.order('name', { ascending: true });

	if (error) {
		log.error('Error fetching all países', { error });
		throw error;
	}

	return data as Country[];
};
