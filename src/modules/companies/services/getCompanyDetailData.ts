import type { SupabaseClient } from '@supabase/supabase-js';
import { getEmpresaById } from '@lib/tablas/companies/empresas';
import { getSociosByEmpresa } from '@lib/tablas/companies/socios';
import { getManagerByEmpresa } from '@lib/tablas/companies/managers';
import { actividadesGeneral } from '@lib/tablas/utils/generals/actividades';
import { PaisesGeneral } from '@lib/tablas/utils/generals/paises';
import { EstadosGeneral } from '@lib/tablas/utils/generals/estados';
import { pagosRealizadosPorSubirById } from '@lib/tablas/payments/PagosPorLeer';
import { getUserFolders } from '@lib/storage/test';
import type { CompanyDetailData } from '../types';

export const getCompanyDetailData = async (
	supabase: SupabaseClient,
	empresaId: string,
): Promise<CompanyDetailData | null> => {
	// Primero, obtener los pagos para extraer el userId
	const pagos = await pagosRealizadosPorSubirById(supabase, empresaId);

	// Extraer userId de los pagos (si existe)
	const userIdFromPagos = pagos?.usuarios?.user_id

	// Luego ejecutar el resto en paralelo
	const [empresa, socios, managers, actividades, paises, estados, documentos] =
		await Promise.all([
			getEmpresaById(supabase, empresaId),
			getSociosByEmpresa(supabase, empresaId),
			getManagerByEmpresa(supabase, empresaId),
			actividadesGeneral(supabase),
			PaisesGeneral(supabase),
			EstadosGeneral(supabase),
			getUserFolders(supabase, userIdFromPagos, empresaId) // Usar el userId extraído
		]);

	if (!empresa) return null;

	return {
		empresa: empresa as CompanyDetailData['empresa'],
		socios: (socios ?? []) as CompanyDetailData['socios'],
		managers: (managers ?? []) as CompanyDetailData['managers'],
		actividades: (actividades ?? []) as CompanyDetailData['actividades'],
		paises: (paises ?? []) as CompanyDetailData['paises'],
		estados: (estados ?? []) as CompanyDetailData['estados'],
		pagos: (pagos ?? []) as CompanyDetailData['pagos'],
		documentos: (documentos ?? []) as CompanyDetailData['documentos'],
	};
};
