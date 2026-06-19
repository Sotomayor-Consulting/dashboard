import type { SupabaseClient } from '@supabase/supabase-js';
import { getEmpresaById } from '@domains/companies/companies';
import { actividadesGeneral } from '@domains/utils/generals/activities';
import { PaisesGeneral } from '@domains/utils/generals/countries-list';
import { listStatesByCountry } from '@domains/locations/states';
import type { CompanyDetailData } from '../types';

/**
 * Aggregator SSR para `/incorporations/[id]` (tab "Editar datos"). Después del
 * refactor, los datos editables de la empresa (direcciones, miembros, health)
 * viven en `/companies/[companyId]` — este servicio sólo trae lo necesario
 * para el form de incorporación + el bloque read-only "Datos de la empresa".
 */
export const getCompanyDetailData = async (
	supabase: SupabaseClient,
	empresaId: string,
): Promise<CompanyDetailData | null> => {
	const [empresa, actividades, paises, states] = await Promise.all([
		getEmpresaById(supabase, empresaId),
		actividadesGeneral(supabase),
		PaisesGeneral(supabase),
		listStatesByCountry(supabase, 75)
	]);

	if (!empresa) return null;

	const companyId = (empresa as { company_id?: string | null }).company_id;
	const company = companyId
		? (
			await supabase
				.from('companies')
				.select(
					`id, legal_name, filing_number, identification_number, entity_type,
						 formation_state_id, formation_country_id, management_type,
						 tax_clasification, activity_code_id, activity_description,
						 us_source_income, joint_ownership,
						 incorporation_date, irs_email, legal_status`,
				)
				.eq('id', companyId)
				.maybeSingle()
		).data
		: null;

	return {
		empresa: empresa as CompanyDetailData['empresa'],
		company: (company as CompanyDetailData['company']) ?? null,
		socios: [],
		addresses: [],
		companyMembers: [],
		managementTypeHealth: null,
		actividades: (actividades ?? []) as unknown as CompanyDetailData['actividades'],
		paises: (paises ?? []) as CompanyDetailData['paises'],
		state: (states ?? []) as CompanyDetailData['state'],
	};
};
