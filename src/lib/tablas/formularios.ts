import { supabase } from '@lib/supabase';

export const ListaFormulariosGeneral = async () => {
	const { data, error } = await supabase
		.from('formularios')
		.select('*', { count: 'exact' })
		.order('titulo', { ascending: false });
	if (error) {
		console.error('Error fetching all países:', error);
		throw error;
	}

	return data;
};

export const ListaFormulariosSurvey = async (FormId: string) => {
	const { data, error } = await supabase
		.from('formularios')
		.select('form_id, titulo, descripcion, schema_json, tema_json')
		.eq('form_id', FormId)
		.single();
	if (error) {
		console.log('Error fetching formulario para survey:', error);
		throw error;
	}
	return data;
};
