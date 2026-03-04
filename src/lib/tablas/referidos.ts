import type { SupabaseClient } from '@supabase/supabase-js';

export const getReferidos = async (
	supabase: SupabaseClient,
	UserId: string,
) => {
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
