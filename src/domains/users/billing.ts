import type { SupabaseClient } from '@supabase/supabase-js';
import { createLogger } from '@infrastructure/logging';

const log = createLogger('domains.billing');

export const FacturacionGeneral = async (supabase: SupabaseClient) => {
	const { data, error } = await supabase
		.from('billing_info')
		.select('*')
		.single();

	if (error) {
		if (error.code === 'PGRST116') return null;
		log.error('Error fetching all facturaciones', { error });
		throw error;
	}

	return data;
};

export const FacturacionbyId = async (
	supabase: SupabaseClient,
	userId: string,
) => {
	const { data, error } = await supabase
		.from('billing_info')
		.select('*')
		.eq('user_id', userId)
		.single();

	if (error) {
		if (error.code === 'PGRST116') return null;
		log.error('Error fetching all facturaciones', { error });
		throw error;
	}

	return data;
};
