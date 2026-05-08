import type { SupabaseClient } from '@supabase/supabase-js';

export interface UserWithRole {
	user: any;
	role:
		| 'guest'
		| 'admin'
		| 'partner'
		| 'cliente'
		| 'operaciones'
		| 'authenticated';
	roles: string[];
}

export async function getUserWithRole(
	supabase: SupabaseClient,
	userId?: string,
): Promise<UserWithRole> {
	if (!userId) {
		return { user: null, role: 'guest', roles: [] };
	}

	const { data: usuarioData } = await supabase
		.from('user_roles')
		.select('roles (name)')
		.eq('user_id', userId);

	const rolePriority = ['admin', 'partner', 'cliente', 'operaciones'];
	const userRoles =
		(usuarioData as any[])?.map((ur: any) => ur.roles?.name).filter(Boolean) ||
		[];

	let userRole = 'guest';
	if (userRoles.length > 0) {
		userRole = rolePriority.find((r) => userRoles.includes(r)) || 'guest';
	}

	return {
		user: { id: userId },
		role: userRole as UserWithRole['role'],
		roles: userRoles,
	};
}
