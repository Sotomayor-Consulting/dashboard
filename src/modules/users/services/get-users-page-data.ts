import type { SupabaseClient } from '@supabase/supabase-js';
import { getAllUsuarios } from '@domains/users/users';
import { RolesGeneral, RolesGeneralUsers } from '@domains/utils/roles/roles';
import { PaisesGeneral } from '@domains/utils/generals/countries-list';

export const getUsersPageData = async (supabase: SupabaseClient) => {
	const [usuarios, roles, paises, rolesGeneral] = await Promise.all([
		getAllUsuarios(supabase),
		RolesGeneral(supabase),
		PaisesGeneral(supabase),
		RolesGeneralUsers(supabase),
	]);

	return {
		usuarios: usuarios ?? [],
		roles: roles ?? [],
		paises: paises ?? [],
		rolesGeneral: rolesGeneral ?? [],
	};
};
