import type { SupabaseClient } from '@supabase/supabase-js';
import { createLogger } from '@infrastructure/logging';

const log = createLogger('domains.billing');

export type BillingInfoRow = {
	id: string;
	user_id: string;
	country_id: number;
	state_id: number | null;
	city: string;
	line1: string;
	line2: string | null;
	zip: string | null;
	phone: string | null;
	email: string | null;
	is_default: boolean;
	created_at: string;
};

export const FacturacionbyId = async (
	supabase: SupabaseClient,
	userId: string,
): Promise<BillingInfoRow | null> => {
	const { data, error } = await supabase
		.from('billing_info')
		.select('*')
		.eq('user_id', userId)
		.single();

	if (error) {
		if (error.code === 'PGRST116') return null;
		log.error('Error fetching billing_info by user_id', { error });
		throw error;
	}

	return data;
};

export const getDefaultBillingInfo = async (
	supabase: SupabaseClient,
	userId: string,
): Promise<BillingInfoRow | null> => {
	const { data, error } = await supabase
		.from('billing_info')
		.select('*')
		.eq('user_id', userId)
		.eq('is_default', true)
		.maybeSingle();

	if (error) {
		log.error('Error fetching default billing_info', { error });
		throw error;
	}

	return data;
};
