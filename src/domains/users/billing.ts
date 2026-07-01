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
	business_name: string | null;
	tax_id: string | null;
	is_default: boolean;
	created_at: string;
	paises?: { name: string } | null;
	states?: { name: string } | null;
};

export const getAllBillingInfo = async (
	supabase: SupabaseClient,
	userId: string,
): Promise<BillingInfoRow[]> => {
	const { data, error } = await supabase
		.from('billing_info')
		.select('*, paises:country_id(name), states:state_id(name)')
		.eq('user_id', userId)
		.order('is_default', { ascending: false })
		.order('created_at', { ascending: true })
		.limit(3);

	if (error) {
		log.error('Error fetching all billing_info', { error });
		return [];
	}

	return data ?? [];
};

export const getBillingInfoById = async (
	supabase: SupabaseClient,
	id: string,
	userId: string,
): Promise<BillingInfoRow | null> => {
	const { data, error } = await supabase
		.from('billing_info')
		.select('*')
		.eq('id', id)
		.eq('user_id', userId)
		.maybeSingle();

	if (error) {
		log.error('Error fetching billing_info by id', { error });
		return null;
	}

	return data;
};

export const countBillingInfo = async (
	supabase: SupabaseClient,
	userId: string,
): Promise<number> => {
	const { count, error } = await supabase
		.from('billing_info')
		.select('id', { count: 'exact', head: true })
		.eq('user_id', userId);

	if (error) {
		log.error('Error counting billing_info', { error });
		return 0;
	}

	return count ?? 0;
};

export type BillingInfoInsert = {
	user_id: string;
	country_id: number;
	city: string;
	line1: string;
	state_id?: number | null;
	line2?: string | null;
	zip?: string | null;
	phone?: string | null;
	email?: string | null;
	business_name?: string | null;
	tax_id?: string | null;
	is_default?: boolean;
};

export const createBillingInfo = async (
	supabase: SupabaseClient,
	payload: BillingInfoInsert,
): Promise<{ id: string } | null> => {
	const { data, error } = await supabase
		.from('billing_info')
		.insert(payload)
		.select('id')
		.single();

	if (error) {
		log.error('Error creating billing_info', { error });
		return null;
	}

	return data;
};

export type BillingInfoUpdate = Partial<
	Omit<BillingInfoInsert, 'user_id'>
>;

export const updateBillingInfo = async (
	supabase: SupabaseClient,
	id: string,
	userId: string,
	payload: BillingInfoUpdate,
): Promise<boolean> => {
	const { error } = await supabase
		.from('billing_info')
		.update(payload)
		.eq('id', id)
		.eq('user_id', userId);

	if (error) {
		log.error('Error updating billing_info', { error });
		return false;
	}

	return true;
};

export const deleteBillingInfo = async (
	supabase: SupabaseClient,
	id: string,
	userId: string,
): Promise<boolean> => {
	const { error } = await supabase
		.from('billing_info')
		.delete()
		.eq('id', id)
		.eq('user_id', userId);

	if (error) {
		log.error('Error deleting billing_info', { error });
		return false;
	}

	return true;
};

export const setDefaultBillingInfo = async (
	supabase: SupabaseClient,
	id: string,
	userId: string,
): Promise<boolean> => {
	const { error } = await supabase
		.from('billing_info')
		.update({ is_default: true })
		.eq('id', id)
		.eq('user_id', userId);

	if (error) {
		log.error('Error setting default billing_info', { error });
		return false;
	}

	return true;
};
