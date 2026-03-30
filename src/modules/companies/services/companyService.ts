import { SupabaseClient } from '@supabase/supabase-js';
import type { CompanyTableRow } from '../types';


export const getCompanies = async (supabase: SupabaseClient): Promise<CompanyTableRow[]> => {
	const { data, error } = await supabase
		.from('companies')
		.select('*')
		.order('created_at', { ascending: false });
	if (error) throw error;
	return data as CompanyTableRow[];
}

export const getCompaniesWithUser = async (supabase: SupabaseClient) => {
	const { data, error } = await supabase
		.from('companies')
		.select(`
			*, 
			user:usuarios!company_user_id_fkey (user_id, nombre),
			formation_country:countries (id, name),
			formation_state:states!companies_formation_state_id_fkey (id, name, code),
			created_by:usuarios!
			`)
	if (error) throw error;
	return data;
}
