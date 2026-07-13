import type { SupabaseClient } from '@supabase/supabase-js';
import { listCompanyAddresses } from '@domains/companies/addresses';
import { listCompanyMembers } from '@domains/companies/company-members';
import { checkManagementTypeHealth } from '@domains/companies/rules/management-type.rules';
import { COMPANY_COLUMNS } from '@domains/companies/types/company';
import { actividadesGeneral } from '@domains/utils/generals/activities';
import type { CompanyItem, CompanyPageData } from '../types';

/**
 * Aggregator SSR para `/companies/[companyId]`. Carga la empresa legal,
 * direcciones, miembros, health del management type y catálogos auxiliares.
 *
 * Devuelve `null` si la empresa no existe.
 */
export async function getCompanyPageData(
	supabase: SupabaseClient,
	companyId: string,
): Promise<CompanyPageData | null> {
	const { data: company, error: companyError } = await supabase
		.from('companies')
		.select(COMPANY_COLUMNS.BASE)
		.eq('id', companyId)
		.maybeSingle<CompanyItem>();

	if (companyError) throw companyError;
	if (!company) return null;

	const [addresses, companyMembers, managementTypeHealth, actividades, statesResult, incorporationLookup] =
		await Promise.all([
			listCompanyAddresses(supabase, companyId),
			listCompanyMembers(supabase, companyId),
			checkManagementTypeHealth(supabase, companyId),
			actividadesGeneral(supabase),
			supabase.from('states').select('id, name, code'),
			supabase
				.from('companies')
				.select('incorporation_id')
				.eq('id', companyId)
				.maybeSingle<{ incorporation_id: string | null }>(),
		]);

	return {
		company,
		addresses: (addresses ?? []) as unknown as CompanyPageData['addresses'],
		companyMembers:
			(companyMembers ?? []) as unknown as CompanyPageData['companyMembers'],
		managementTypeHealth:
			(managementTypeHealth ?? null) as CompanyPageData['managementTypeHealth'],
		actividades: (actividades ?? []) as unknown as CompanyPageData['actividades'],
		states: (statesResult.data ?? []) as CompanyPageData['states'],
		incorporationId:
			incorporationLookup.data?.incorporation_id ?? null,
	};
}
