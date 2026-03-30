import type { SupabaseClient } from '@supabase/supabase-js';
import { getAllUsuarios } from '@lib/tablas/usuarios';
import { RolesGeneral, RolesGeneralUsers } from '@lib/tablas/roles';
import { getCountries } from '@lib/tablas/countries';

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
