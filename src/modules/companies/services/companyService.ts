import { SupabaseClient } from '@supabase/supabase-js';
import type { Company } from '../types';


export const getCompanies = async (supabase: SupabaseClient): Promise<Company[]> => {
	const { data, error } = await supabase
		.from('companies')
		.select('*')
		.order('created_at', { ascending: false });

	if (error) throw error;
	return data as Company[];
}
