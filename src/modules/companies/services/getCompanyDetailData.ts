import type { SupabaseClient } from '@supabase/supabase-js';
import { getEmpresaById } from '@lib/tables/companies/empresas';
import { getSociosByEmpresa } from '@lib/tables/companies/socios';
import { getManagerByEmpresa } from '@lib/tables/companies/managers';
import { actividadesGeneral } from '@lib/tables/utils/generals/actividades';
import { PaisesGeneral } from '@lib/tables/utils/generals/paises';
import { EstadosGeneral } from '@lib/tables/utils/generals/estados';
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
		estados: (estados ?? []) as CompanyDetailData['estados'],
	};
};
