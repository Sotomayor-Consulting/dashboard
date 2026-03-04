import type { SupabaseClient } from '@supabase/supabase-js';

export const getUserEmail = async (supabase: SupabaseClient) => {
	const {
		data: { user },
		error,
	} = await supabase.auth.getUser();

	if (error) {
		console.error('Error fetching user email:', error);
		return null;
	}

	return user?.email || null;
};

export const UsersGeneral = async (supabase: SupabaseClient) => {
	const {
		data: { user },
		error,
	} = await supabase.auth.getUser();

	if (error) {
		console.error('Error fetching user:', error);
		return null;
	}

	return user;
};
