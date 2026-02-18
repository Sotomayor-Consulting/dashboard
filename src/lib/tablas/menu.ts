import { supabase } from '@lib/supabase';

export interface UserWithRole {
	user: any;
	role: 'guest' | 'admin' | 'partner' | 'client' | 'authenticated';
}

export async function getUserWithRole(): Promise<UserWithRole> {
	const {
		data: { user },
	} = await supabase.auth.getUser();

	let userRole = 'guest';

	if (user) {
		const { data: isAdminRes } = await supabase.rpc('is_admin', { uid: user.id });

		if (isAdminRes) {
			userRole = 'admin';
		} else {
			const { data: userData } = await supabase
				.from('usuarios')
				.select('rol_id')
				.eq('user_id', user.id)
				.single();

			const roleMap: Record<number, string> = {
				2: 'partner',
				3: 'client',
			};

			if (userData && userData.rol_id) {
				userRole = roleMap[Number(userData.rol_id)] || 'authenticated';
			}
		}
	}

	return { user, role: userRole as UserWithRole['role'] };
}