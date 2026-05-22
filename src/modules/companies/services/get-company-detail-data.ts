import type { SupabaseClient } from '@supabase/supabase-js';
import { getEmpresaById } from '@domains/companies/companies';
import { getSociosByEmpresa } from '@domains/companies/members';
import { getManagerByEmpresa } from '@domains/companies/managers';
import { listCompanyAddresses } from '@domains/companies/addresses';
import { listCompanyMembers } from '@domains/companies/company-members';
import { actividadesGeneral } from '@domains/utils/generals/activities';
import { PaisesGeneral } from '@domains/utils/generals/countries-list';
import { EstadosGeneral } from '@domains/utils/generals/states';
import type { CompanyDetailData } from '../types';

export const getCompanyDetailData = async (
	supabase: SupabaseClient,
	empresaId: string,
): Promise<CompanyDetailData | null> => {
	const [empresa, socios, managers, actividades, paises, estados] =
		await Promise.all([
			getEmpresaById(supabase, empresaId),
			getSociosByEmpresa(supabase, empresaId),
			getManagerByEmpresa(supabase, empresaId),
			actividadesGeneral(supabase),
			PaisesGeneral(supabase),
			EstadosGeneral(supabase),
		]);

	if (!empresa) return null;

	const companyId = (empresa as { company_id?: string | null }).company_id;
	const [company, addresses, companyMembers] = await Promise.all([
		companyId
			? supabase
				.from('companies')
				.select(
					`id, legal_name, identification_number, entity_type,
						formation_state_id, formation_country_id, management_type,
						tax_clasification, activity_code_id, activity_description,
						us_source_income, joint_ownership,
						incorporation_date, irs_email, legal_status`,
				)
				.eq('id', companyId)
				.maybeSingle()
			: Promise.resolve({ data: null, error: null }),
		listCompanyAddresses(supabase, empresaId, companyId),
		companyId ? listCompanyMembers(supabase, companyId) : [],
	]);

	if (company && 'error' in company && company.error) {
		throw company.error;
	}

	const companyData = company && 'data' in company ? company.data : null;

	return {
		empresa: empresa as CompanyDetailData['empresa'],
		company: (companyData as CompanyDetailData['company']) ?? null,
		socios: (socios ?? []) as CompanyDetailData['socios'],
		addresses: (addresses ?? []) as unknown as CompanyDetailData['addresses'],
		companyMembers:
			(companyMembers ?? []) as unknown as CompanyDetailData['companyMembers'],
		managers: (managers ?? []) as CompanyDetailData['managers'],
		actividades: (actividades ?? []) as unknown as CompanyDetailData['actividades'],
		paises: (paises ?? []) as CompanyDetailData['paises'],
		state: (estados ?? []) as CompanyDetailData['state'],
	};
};
