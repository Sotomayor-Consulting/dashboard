import type { SupabaseClient } from '@supabase/supabase-js';
import { createLogger } from '@infrastructure/logging';

const log = createLogger('domains.forms');

export const ListaFormulariosGeneral = async (supabase: SupabaseClient) => {
	const { data, error } = await supabase
		.from('formularios')
		.select('*', { count: 'exact' })
		.order('titulo', { ascending: false });
	if (error) {
		log.error('Error fetching all países', { error });
		throw error;
	}

	return data;
};

export const ListaFormulariosSurvey = async (
	supabase: SupabaseClient,
	FormId: string,
) => {
	const { data, error } = await supabase
		.from('formularios')
		.select('form_id, titulo, descripcion, schema_json, tema_json')
		.eq('form_id', FormId)
		.single();
	if (error) {
		log.error('Error fetching formulario para survey', { error });
		throw error;
	}
	return data;
};
