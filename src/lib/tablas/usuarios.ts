import { supabase } from '@lib/supabase';

export const getAllUsuarios = async () => {
	const { data, error } = await supabase
		.from('usuarios')
		.select('*, paises ( id, nombre_paises )')
		.order('created_at', { ascending: false });

	if (error) {
		console.error('Error fetching all usuarios:', error);
		throw error;
	}

	return data;
};

export const getUsuarioById = async (userId: string) => {
	const { data, error } = await supabase
		.from('usuarios')
		.select('*')
		.eq('user_id', userId)
		.single();

	if (error) {
		console.error('Error fetching usuario by ID:', error);
		throw error;
	}

	return data;
};

export const getUsuarioAvatar = async (userId: string) => {
	const { data, error } = await supabase
		.from('usuarios')
		.select('avatar_url')
		.eq('user_id', userId)
		.single();

	if (error) {
		console.error('Error fetching usuario by ID:', error);
		throw error;
	}

	return data;
};

export const getUsuarioPerfilPartner = async (userId: string) => {
	const { data, error } = await supabase
		.from('usuarios')
		.select('direccion_linea1, direccion_linea2, tipo_identificacion, numero_de_identificacion, tipo_persona')
		.eq('user_id', userId)
		.single();

	if (error) {
		console.error('Error fetching usuario perfil partner:', error);
		throw error;
	}

	return data;
};

export const PARTNER_REQUIRED_FIELDS = [
	'direccion_linea1',
	'direccion_linea2',
	'tipo_identificacion',
	'numero_de_identificacion',
	'tipo_persona',
] as const;

export type PartnerRequiredField = (typeof PARTNER_REQUIRED_FIELDS)[number];

export const getMissingPartnerFields = async (userId: string): Promise<PartnerRequiredField[]> => {
	const profile = await getUsuarioPerfilPartner(userId);
	
	if (!profile) return [];

	return PARTNER_REQUIRED_FIELDS.filter((field): field is PartnerRequiredField => {
		const value = profile[field];
		return value === null || value === undefined || value === '';
	});
};
