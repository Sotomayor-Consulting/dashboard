import type { SupabaseClient } from '@supabase/supabase-js';
import { getAllUsuarios } from '@lib/tables/users/usuarios';
import { RolesGeneral, RolesGeneralUsers } from '@lib/tables/utils/roles/roles';
import { PaisesGeneral } from '@lib/tables/utils/generals/paises';

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
