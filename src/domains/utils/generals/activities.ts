import type { SupabaseClient } from '@supabase/supabase-js';

export const actividadesGeneral = async (supabase: SupabaseClient) => {
	const { data, error } = await supabase
		.from('activity')
		.select('id, irs_code, name_es, name_en, category:category_id(id, name, sector:sector_id(id, name))')
		.order('irs_code');
	if (error) throw error;
	return data;
};
