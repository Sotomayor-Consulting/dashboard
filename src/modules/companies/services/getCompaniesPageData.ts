import type { SupabaseClient } from '@supabase/supabase-js';
import { IncorporacionesEmpresasBase } from '@lib/tablas/empresa_incorporaciones';
import type { CompanyCrudRow } from '../types';

export const getCompaniesPageData = async (
	supabase: SupabaseClient,
	): Promise<CompanyCrudRow[]> => {
	const empresas = await IncorporacionesEmpresasBase(supabase);

	return (empresas ?? []).map((empresa) => ({
		empresa_incorporacion_id: String(empresa.empresa_incorporacion_id ?? ''),
		nombre_1: String(empresa.nombre_1 ?? ''),
		tipo_de_negocio: empresa.tipo_de_negocio ?? null,
		porcentaje_de_incorporacion: empresa.porcentaje_de_incorporacion ?? null,
		estado_de_incorporacion: empresa.estado_de_incorporacion ?? null,
		estado: empresa.estado ?? null,
		updated_at: empresa.updated_at ?? null,
		created_by_name:
			empresa.usuarios?.[0]
				? `${empresa.usuarios[0].nombre ?? ''} ${empresa.usuarios[0].apellido ?? ''}`.trim()
				: 'Sin usuario',
	}));
};
