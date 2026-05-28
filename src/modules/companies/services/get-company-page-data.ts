import type { SupabaseClient } from '@supabase/supabase-js';
import { listCompanyAddresses } from '@domains/companies/addresses';
import { listCompanyMembers } from '@domains/companies/company-members';
import { checkManagementTypeHealth } from '@domains/companies/rules/management-type.rules';
import { actividadesGeneral } from '@domains/utils/generals/activities';
import { EstadosGeneral } from '@domains/utils/generals/states';
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
		.select(
			`id, legal_name, filing_number, identification_number, entity_type,
			 formation_state_id, formation_country_id, management_type,
			 tax_clasification, activity_code_id, activity_description,
			 us_source_income, joint_ownership,
			 incorporation_date, irs_email, legal_status`,
		)
		.eq('id', companyId)
		.maybeSingle<CompanyItem>();

	if (companyError) throw companyError;
	if (!company) return null;

	const [addresses, companyMembers, managementTypeHealth, actividades, states, incorporationLookup] =
		await Promise.all([
			listCompanyAddresses(supabase, companyId),
			listCompanyMembers(supabase, companyId),
			checkManagementTypeHealth(supabase, companyId),
			actividadesGeneral(supabase),
			EstadosGeneral(supabase),
			supabase
				.from('empresas_incorporaciones')
				.select('empresa_incorporacion_id')
				.eq('company_id', companyId)
				.maybeSingle<{ empresa_incorporacion_id: string }>(),
		]);

	return {
		company,
		addresses: (addresses ?? []) as unknown as CompanyPageData['addresses'],
		companyMembers:
			(companyMembers ?? []) as unknown as CompanyPageData['companyMembers'],
		managementTypeHealth:
			(managementTypeHealth ?? null) as CompanyPageData['managementTypeHealth'],
		actividades: (actividades ?? []) as unknown as CompanyPageData['actividades'],
		states: (states ?? []) as CompanyPageData['states'],
		incorporationId:
			incorporationLookup.data?.empresa_incorporacion_id ?? null,
	};
}
