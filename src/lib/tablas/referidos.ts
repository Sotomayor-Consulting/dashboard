import { supabase } from '@lib/supabase';

export const getReferidos = async (UserId: string) => {
	const { data, error } = await supabase
		.from('referidos')
		.select(
			`
    id,
    code,
    created_at,
    referido:usuarios!referidos_referido_id_fkey (
      user_id, nombre, apellido, correo, avatar_url, estado
    ),
    partner:usuarios!referidos_partner_id_fkey (
      user_id, nombre, apellido, correo, avatar_url, estado
    )
  `,
		)
		.eq('partner_id', UserId)
		.order('created_at', { ascending: false });
	if (error) {
		console.error('Error fetching referidos:', error);
		throw error;
	}
	return data;
};

export const getCodigoDePartner = async (UserId: string) => {
	const { data, error } = await supabase
		.from('usuarios')
		.select('codigo_de_partner')
		.eq('user_id', UserId)
		.single();
	if (error) {
		console.error('Error fetching  Codigo de partner:', error);
		throw error;
	}
	return data;
};
