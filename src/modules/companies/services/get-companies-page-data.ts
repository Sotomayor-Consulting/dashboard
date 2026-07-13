import type { SupabaseClient } from '@supabase/supabase-js';
import { IncorporacionesEmpresasBase } from '@domains/companies/incorporations';
import type { CompanyCrudRow } from '../types';

export const getCompaniesPageData = async (
	supabase: SupabaseClient,
	): Promise<CompanyCrudRow[]> => {
	const empresas = await IncorporacionesEmpresasBase(supabase);

	return (empresas ?? []).map((empresa) => ({
		id: String(empresa.id ?? ''),
		principal_name: String(empresa.principal_name ?? ''),
		entity_type: empresa.entity_type ?? null,
		porcentaje_de_incorporacion: empresa.porcentaje_de_incorporacion ?? null,
		estado: empresa.state ?? null,
		updated_at: empresa.updated_at ?? null,
		created_by_name:
			empresa.usuarios?.[0]
				? `${empresa.usuarios[0].nombre ?? ''} ${empresa.usuarios[0].apellido ?? ''}`.trim()
				: 'Sin usuario',
	}));
};
