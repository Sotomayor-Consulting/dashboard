import type { SupabaseClient } from '@supabase/supabase-js';

const normalizeSocio = (row: any) => ({
	id: String(row.id ?? ''),
	id_empresa: String(row.id_empresa ?? row.company_id ?? ''),
	nombre_de_socio: row.nombre_de_socio ?? row.name ?? null,
	correo: row.correo ?? row.email ?? null,
	tipo_de_socio: row.tipo_de_socio ?? row.member_type ?? null,
	porcentaje: row.porcentaje ?? row.percentage ?? null,
	pais_de_nacionalidad:
		row.pais_de_nacionalidad ?? row.nationality_country ?? null,
	estado_civil: row.estado_civil ?? row.marital_status ?? null,
	residente_fiscal: row.residente_fiscal ?? row.tax_resident ?? null,
	numero_de_pasaporte: row.numero_de_pasaporte ?? row.passport_number ?? null,
	numero_de_seguro_social:
		row.numero_de_seguro_social ?? row.social_security_number ?? null,
	numero_itin: row.numero_itin ?? row.itin_number ?? null,
	direccion_planilla: row.direccion_planilla ?? row.payroll_address ?? null,
	roles: row.roles ?? null,
});

export const getSociosByEmpresa = async (
	supabase: SupabaseClient,
	empresaId: string,
) => {
	const { data: membersData, error: membersError } = await supabase
		.from('members')
		.select('*')
		.eq('id_empresa', empresaId);

	if (!membersError && membersData && membersData.length > 0) {
		return membersData.map(normalizeSocio);
	}

	const { data, error } = await supabase
		.from('socios_validados')
		.select('*')
		.eq('id_empresa', empresaId);

	if (error) {
		console.error('Error fetching socios:', error);
		throw error;
	}

	return (data ?? []).map(normalizeSocio);
};

export const getAllSocios = async (supabase: SupabaseClient) => {
	const { data, error } = await supabase
		.from('socios_validados')
		.select('*');

	if (error) {
		console.error('Error fetching all socios:', error);
		throw error;
	}

	return data;
};

export const getSocioById = async (
	supabase: SupabaseClient,
	id: string,
) => {
	const { data, error } = await supabase
		.from('socios_validados')
		.select('*')
		.eq('id', id)
		.single();

	if (error) {
		console.error('Error fetching socio by ID:', error);
		throw error;
	}

	return data;
};
