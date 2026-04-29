import type { SupabaseClient } from '@supabase/supabase-js';
import type { FormulariosItem } from '@modules/forms/types';

export const FormsEnviosVericacion = async (supabase: SupabaseClient) => {
	const { data, error } = await supabase
		.from('submitted_forms')
		.select(
			'*, formularios (form_id, titulo, slug, descripcion), usuarios (user_id, nombre, apellido)',
		)
		.eq('status', 'submitted')
		.eq('verificacion_operaciones', false)
		.eq('formularios.titulo', 'Formulario de incorporación')
		.order('updated_at', { ascending: true });

	if (error) {
		console.error(
			'Error fetching all formularios enviados a verificación:',
			error,
		);
		throw error;
	}

	return (data ?? []).map((item): FormulariosItem => ({
		submission_id: item.submission_id,
		progress_percent: item.progress_percent ?? 0,
		created_at: item.created_at ?? null,
		updated_at: item.updated_at ?? null,
		submitted_at: item.submitted_at ?? null,
		status: item.status ?? null,
		formularios: Array.isArray(item.formularios)
			? (item.formularios[0] ?? null)
			: (item.formularios ?? null),
		usuarios: Array.isArray(item.usuarios)
			? (item.usuarios[0] ?? null)
			: (item.usuarios ?? null),
	}));
};
