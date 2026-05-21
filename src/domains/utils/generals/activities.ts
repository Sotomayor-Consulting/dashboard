import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Trae todas las actividades con su categoría y sector embebidos.
 *
 * Postgres devuelve los `id` como integer, así que aquí se coaccionan a
 * string para que coincidan con los tipos del wizard y para que los
 * componentes Radix (Select, etc.) que requieren string como `value` no
 * fallen en comparaciones estrictas.
 */
export const actividadesGeneral = async (supabase: SupabaseClient) => {
	const { data, error } = await supabase
		.from('activity')
		.select(
			'id, irs_code, name_es, name_en, category:category_id(id, name, sector:sector_id(id, name))',
		)
		.order('irs_code');
	if (error) throw error;
	if (!data) return [];
	return data.map((a: any) => ({
		id: String(a.id),
		irs_code: a.irs_code,
		name_es: a.name_es,
		name_en: a.name_en,
		category: a.category
			? {
					id: String(a.category.id),
					name: a.category.name,
					sector: a.category.sector
						? {
								id: String(a.category.sector.id),
								name: a.category.sector.name,
							}
						: null,
				}
			: null,
	}));
};
