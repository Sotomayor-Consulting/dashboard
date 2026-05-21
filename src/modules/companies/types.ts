// ── Enums / unions ──────────────────────────────────────────────
export type TaxClasification = 'disregarded_entity' | 'corporation';
export type Managmentype = 'member-managed' | 'manager-managed';
export type EntityLLC = 'llc';
export type LegalStatus =
	| 'draft'
	| 'pending_validation'
	| 'active'
	| 'inactive'
	| 'suspended'
	| 'pending'
	| 'dissolved';

// ── companies table (legacy) ────────────────────────────────────
export interface Company {
	id: string;
	legal_name: string | null;
	identification_number: string | null;
	entity_type: string;
	formation_state_id: number;
	formation_country_id: number;
	tax_clasification: TaxClasification;
	management_type: Managmentype;
	activity_code_id: number;
	activity_description: string;
	activity_service: string;
	us_source_income: boolean;
	joint_ownership: boolean;
	incorporation_date: string | null;
	irs_email: string;
	legal_status: string;
	created_at: string | null;
	created_by: string;
	updated_at: string | null;
	updated_by: string;
}

export interface Country {
	id: number;
	iso: string;
	name: string;
	phone_code: string;
}

export type CompanyTableRow = Omit<Company, 'formation_country_id' | 'tax_clasification'> & {
	formation_country: string;
	tax_clasification: string;
};

// ── empresas_incorporaciones (CRUD list row) ────────────────────
export interface CompanyCrudRow {
	empresa_incorporacion_id: string;
	nombre_1: string;
	tipo_de_negocio: string | null;
	porcentaje_de_incorporacion: number | null;
	estado_de_incorporacion: string | null;
	estado: string | null;
	updated_at: string | null;
	created_by_name: string;
}

// ── Detail view types (empresas_incorporaciones + relations) ────
export interface EmpresaDetail {
	empresa_incorporacion_id: string;
	company_id: string | null;
	user_id: string;
	nombre_1: string | null;
	nombre_2: string | null;
	nombre_3: string | null;
	tipo_de_negocio: string | null;
	estado_de_incorporacion: string | null;
	estado: string | null;
	porcentaje_de_incorporacion: number | null;
	actividad: string | null;
	activity_id: number | null;
	descripcion_empresa: string | null;
	activity_description: string | null;
	forma_tributacion: string | null;
	forma_administracion: string | null;
	Obtendra_ingresos_desde_eeuu: boolean | null;
	responsable_irs: string | null;
	informacion_miembros: string | null;
	direccion_operativa_eeuu: string | null;
	direccion_eeuu: string | null;
	condado_eeuu: string | null;
	ciudad_eeuu: string | null;
	estado_eeuu: string | null;
	codigo_postal_eeuu: string | null;
	Pais_operativo: string | null;
	direccion_empresa: string | null;
	manager_sci: boolean | null;
	manager_es_miembro: boolean | null;
	updated_at: string | null;
	usuarios?: { nombre: string | null; apellido: string | null; correo: string | null }[];
	state_id: number;
}

export interface SocioItem {
	id: string;
	id_empresa: string;
	nombre_de_socio: string | null;
	correo: string | null;
	tipo_de_socio: string | null;
	porcentaje: number | null;
	pais_de_nacionalidad: string | null;
	estado_civil: string | null;
	residente_fiscal: string | null;
	numero_de_pasaporte: string | null;
	numero_de_seguro_social: string | null;
	numero_itin: string | null;
	direccion_planilla: string | null;
	roles: string[] | null;
}

export interface CompanyMemberAddressItem {
	id: number;
	company_member_id: number;
	type: 'tax' | 'residence' | 'mailing' | 'other';
	line1: string;
	line2: string | null;
	city: string | null;
	state_id: number | null;
	state: string | null;
	country_id: number | null;
	zip: string | null;
	is_primary: boolean;
	deleted_at: string | null;
}

export interface CompanyAddressItem {
	id: number;
	incorporation_id: string;
	company_id: string | null;
	type: string;
	line1: string;
	line2: string | null;
	city: string;
	county: string | null;
	zip: string | null;
	country_id: number;
	state_id: number | null;
	country?: string | null;
	state?: string | null;
	deleted_at: string | null;
}

export interface CompanyMemberItem {
	id: number;
	company_id: string;
	full_name: string | null;
	email: string | null;
	member_type: string | null;
	country_nationality_id: number | null;
	marital_status: string | null;
	is_us_tax_resident: boolean | null;
	passport_number: string | null;
	ssn: string | null;
	itin: string | null;
	is_member: boolean | null;
	is_manager: boolean | null;
	percentage: number | null;
	is_active: boolean | null;
	deleted_at: string | null;
	tax_address?: CompanyMemberAddressItem | null;
}

export interface ManagerItem {
	id: string;
	empresa_incorporacion_id: string;
	Nombres_manager: string | null;
	Correo_electronico_manager: string | null;
	Pais_de_nacionalidad_manager: string | null;
	residente_fiscal_en_EE_UU_manager: boolean | null;
	manager_misma_direccion_empresa: boolean | null;
	Numero_de_pasaporte_manager: string | null;
	Numero_de_seguro_social_manager: string | null;
	Numero_de_ITIN_manager: string | null;
	Direccion_de_planilla_manager: string | null;
}

export interface ActividadItem {
	id: number;
	irs_code: string;
	name_es: string;
	name_en: string;
	category: {
		id: number;
		name: string;
		sector?: { id: number; name: string }
	}
}


export interface PaisItem {
	id: number;
	name: string;
}


export interface Usuario {
	user_id: string;
	nombre: string;
	apellido: string;
	correo: string;
}

export interface PagoPorLeer {
	user_id: string;
	servicio_id: string;
	amount: number;
	status: string;
	created_at: string;
	stripe_payment_intent_id: string;
	empresa_incorporacion_id: string;
	visto_por_operaciones: boolean;
	id_pagos: string;
	servicios?: {
		id_servicios: string;
		nombre: string;
		categoria: string;
	}
	usuarios?: {
		user_id: string;
		nombre: string;
		apellido: string;
		correo: string;
	}
	empresas_incorporaciones?: {
		estado: string;
		nombre_1: string;
		tipo_de_negocio: string;
		empresa_incorporacion_id: string;
	}
}

export interface Documento {
	name: string;
}

export interface CompanyDetailData {
	empresa: EmpresaDetail;
	socios: SocioItem[];
	addresses: CompanyAddressItem[];
	companyMembers: CompanyMemberItem[];
	managers: ManagerItem[];
	actividades: ActividadItem[];
	paises: PaisItem[];
	state: State[];
}

export interface State {
	id: number,
	name: String,
	code: String
}
