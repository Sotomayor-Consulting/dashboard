import { SupabaseClient } from '@supabase/supabase-js';
import type { Incorporation, IncorporationWithCompany } from '../types';

export const getIncorporations = async (
	supabase: SupabaseClient,
): Promise<Incorporation[]> => {
	const { data, error } = await supabase
		.from('incorporation_workflow')
		.select('*')
		.order('created_at', { ascending: false });

	if (error) throw error;
	return data as Incorporation[];
};

export const getIncorporationsWithCompanies = async (
	supabase: SupabaseClient,
) => {
	const { data, error } = await supabase.from('incorporation_workflow')
		.select(`*,
		company:companies(*)`);
	if (error) throw error;
	return data as IncorporationWithCompany[];
};
