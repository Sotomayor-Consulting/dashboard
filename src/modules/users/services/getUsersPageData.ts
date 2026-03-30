import type { SupabaseClient } from '@supabase/supabase-js';
import { getAllUsuarios } from '@lib/tablas/users/usuarios';
import { RolesGeneral, RolesGeneralUsers } from '@lib/tablas/utils/roles/roles';
import { PaisesGeneral } from '@lib/tablas/utils/generals/paises';

export const getUsersPageData = async (supabase: SupabaseClient) => {
	const [usuarios, roles, paises, rolesGeneral] = await Promise.all([
		getAllUsuarios(supabase),
		RolesGeneral(supabase),
		getCountries(supabase),
		RolesGeneralUsers(supabase),
	]);

	return {
		usuarios: usuarios ?? [],
		roles: roles ?? [],
		paises: paises ?? [],
		rolesGeneral: rolesGeneral ?? [],
	};
};
