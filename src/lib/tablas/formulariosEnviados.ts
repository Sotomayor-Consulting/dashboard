import { supabase } from '@lib/supabase';

export interface FormularioPendiente {
	id: string;
	status: string;
	verificacion_operaciones: boolean;
	updated_at: string;
	formularios: {
		form_id: string;
		titulo: string;
		slug: string;
		descripcion: string;
	};
	usuarios: {
		user_id: string;
		nombre: string;
		apellido: string;
	};
}

export async function getFormulariosPendientes(): Promise<{
	count: number;
	data: FormularioPendiente[];
}> {
	const { data: formularios } = await supabase
		.from('formularios_envios')
		.select(
			`
      *,
      formularios:formularios (form_id, titulo, slug, descripcion),
      usuarios:usuarios (user_id, nombre, apellido)
    `,
		)
		.eq('status', 'submitted')
		.eq('verificacion_operaciones', false)
		.eq('formularios.titulo', 'Formulario de incorporación')
		.order('updated_at', { ascending: true });

	const count = formularios?.length || 0;

	return { count, data: formularios || [] };
}

export const FormsEnviosVericacion = async () => {
	const { data, error } = await supabase
		.from('formularios_envios')
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

	return data;
};

export const FormsEnviadosDataGeneral = async () => {
	const { data, error } = await supabase
		.from('formularios_envios')
		.select(
			`*,
    formularios ( form_id, titulo, slug, descripcion ),
    usuarios ( user_id, nombre, apellido )
  `,
			{ count: 'exact' },
		)
		.order('created_at', { ascending: false });
	if (error) {
		console.error(
			'Error fetching all formularios enviados a verificación:',
			error,
		);
		throw error;
	}

	return data;
};

export const FormsEnviadosForId = async (userId: string) => {
	const { data, error } = await supabase
		.from('formularios_envios')
		.select(
			'*, formularios ( form_id, titulo, slug, descripcion ),usuarios ( user_id, nombre, apellido )',
		)
		.eq('user_id', userId)
		.order('submitted_at', { ascending: true });
	if (error) {
		console.error(
			'Error fetching all formularios a verificación por id',
			error,
		);
		throw error;
	}
	return data;
};
