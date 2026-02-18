import { supabase } from '@lib/supabase';

export const getUserEmail = async (context: any) => {
	// Restaurar sesión desde cookies
	const { cookies } = context;
	const accessToken = cookies.get('sb-access-token');
	const refreshToken = cookies.get('sb-refresh-token');

	if (!accessToken || !refreshToken) {
		return null;
	}

	await supabase.auth.setSession({
		access_token: accessToken.value,
		refresh_token: refreshToken.value,
	});

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

export const UsersGeneral = async (context: any) => {
	// Restaurar sesión desde cookies
	const { cookies } = context;
	const accessToken = cookies.get('sb-access-token');
	const refreshToken = cookies.get('sb-refresh-token');

	if (!accessToken || !refreshToken) {
		return null;
	}

	await supabase.auth.setSession({
		access_token: accessToken.value,
		refresh_token: refreshToken.value,
	});

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
