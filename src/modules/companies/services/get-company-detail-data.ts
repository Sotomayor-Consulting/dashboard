import type { SupabaseClient } from '@supabase/supabase-js';
import { getEmpresaById } from '@domains/companies/companies';
import { getSociosByEmpresa } from '@domains/companies/members';
import { getManagerByEmpresa } from '@domains/companies/managers';
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

	return {
		empresa: empresa as CompanyDetailData['empresa'],
		socios: (socios ?? []) as CompanyDetailData['socios'],
		managers: (managers ?? []) as CompanyDetailData['managers'],
		actividades: (actividades ?? []) as CompanyDetailData['actividades'],
		paises: (paises ?? []) as CompanyDetailData['paises'],
		state: (estados ?? []) as CompanyDetailData['state'],
	};
};
