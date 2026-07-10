import type { SupabaseClient } from '@supabase/supabase-js';
import { getEmpresaById } from '@domains/companies/companies';
import { COMPANY_COLUMNS, type CompanyRow } from '@domains/companies/types/company';
import { actividadesGeneral } from '@domains/utils/generals/activities';
import { PaisesGeneral } from '@domains/utils/generals/countries-list';
import { listStatesByCountry } from '@domains/locations/states';
import type { CompanyDetailData } from '../types';

export const getCompanyDetailData = async (
	supabase: SupabaseClient,
	empresaId: string,
): Promise<CompanyDetailData | null> => {
	const [empresa, actividades, paises, states] = await Promise.all([
		getEmpresaById(supabase, empresaId),
		actividadesGeneral(supabase),
		PaisesGeneral(supabase),
		listStatesByCountry(supabase, 75),
	]);

	if (!empresa) return null;

	const companyId = empresa.company_id;
	const company: CompanyRow | null = companyId
		? (
			await supabase
				.from('companies')
				.select(COMPANY_COLUMNS.BASE)
				.eq('id', companyId)
				.maybeSingle<CompanyRow>()
		).data
		: null;

	return {
		empresa: empresa as unknown as CompanyDetailData['empresa'],
		company: company as unknown as CompanyDetailData['company'] ?? null,
		socios: [],
		addresses: [],
		companyMembers: [],
		managementTypeHealth: null,
		actividades: (actividades ?? []) as unknown as CompanyDetailData['actividades'],
		paises: (paises ?? []) as CompanyDetailData['paises'],
		state: (states ?? []) as CompanyDetailData['state'],
	};
};
