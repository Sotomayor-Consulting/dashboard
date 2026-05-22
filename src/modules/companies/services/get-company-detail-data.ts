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
	const [canonicalCompany, addresses, companyMembers] = await Promise.all([
		companyId
			? supabase
					.from('companies')
					.select(
						'id, legal_name, identification_number, entity_type, management_type, tax_clasification, activity_description',
					)
					.eq('id', companyId)
					.maybeSingle()
			: Promise.resolve({ data: null, error: null }),
		listCompanyAddresses(supabase, empresaId, companyId),
		companyId ? listCompanyMembers(supabase, companyId) : [],
	]);

	if (canonicalCompany && 'error' in canonicalCompany && canonicalCompany.error) {
		throw canonicalCompany.error;
	}

	const canonicalCompanyData =
		canonicalCompany && 'data' in canonicalCompany
			? canonicalCompany.data
			: null;

	return {
		empresa: empresa as CompanyDetailData['empresa'],
		canonicalCompany:
			(canonicalCompanyData as CompanyDetailData['canonicalCompany']) ?? null,
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
