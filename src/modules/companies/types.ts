// ── Enums / unions ──────────────────────────────────────────────
export type TaxClasification = 'disregarded_entity' | 'corporation';
export type Managmentype = 'member-managed' | 'manager-managed';
export type EntityType = 'llc' | 'lp' | 'c-corp';
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
	tax_clasification: TaxClasification | null;
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

// ── members (master data) ───────────────────────────────────────
export type MemberPersonType = 'natural_person' | 'juridical_person';

export type MemberIdentificationType =
	| 'passport'
	| 'national_id'
	| 'driver_licence'
	| 'ein';

export type MemberMaritalStatus =
	| 'single'
	| 'married'
	| 'widowed'
	| 'divorced'
	| 'legally_separated'
	| 'civil_union'
	| 'annulled';

export interface MemberItem {
	id: string;
	first_name: string | null;
	last_name: string | null;
	full_name: string | null;
	name: string | null;
	birth_date: string | null;
	incorporation_date: string | null;
	person_type: MemberPersonType;
	is_entity: boolean | null;
	identification_number: string | null;
	identification_type: MemberIdentificationType;
	country_nationality_id: number | null;
	country_residence_id: number | null;
	country_id: number | null;
	marital_status: MemberMaritalStatus | null;
	ssn: string | null;
	itin: string | null;
	user_id: string | null;
	is_member: boolean | null;
	is_manager: boolean | null;
}

// ── company_members (join table: member ↔ company con atributos de relacion) ──
export interface CompanyMemberItem {
	id: number;
	company_id: string;
	member_id: string;
	percentage: number | null;
	start_date: string | null;
	end_date?: string | null;
	is_member: boolean;
	is_manager: boolean;
	is_active: boolean | null;
	created_at?: string;
	deleted_at: string | null;
	member: MemberItem | null;
}

export interface CompanyItem {
	id: string;
	legal_name: string | null;
	filing_number: string | null;
	identification_number: string | null;
	entity_type: EntityType;
	formation_state_id: number | null;
	formation_country_id: number | null;
	tax_clasification: TaxClasification | null;
	management_type: Managmentype;
	activity_code_id: number | null;
	activity_description: string | null;
	us_source_income?: boolean | null;
	joint_ownership?: boolean | null;
	incorporation_date?: string | null;
	irs_email?: string | null;
	legal_status: LegalStatus;
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
	company: CompanyItem | null;
	socios: SocioItem[];
	addresses: CompanyAddressItem[];
	companyMembers: CompanyMemberItem[];
	managementTypeHealth: CompanyManagementTypeHealth | null;
	actividades: ActividadItem[];
	paises: PaisItem[];
	state: State[];
}

/**
 * Datos consumidos por la página `/companies/[companyId]`. A diferencia de
 * `CompanyDetailData`, no incluye `empresa` (caso de incorporación) — la
 * empresa real es la entidad principal.
 */
export interface CompanyPageData {
	company: CompanyItem;
	addresses: CompanyAddressItem[];
	companyMembers: CompanyMemberItem[];
	managementTypeHealth: CompanyManagementTypeHealth | null;
	actividades: ActividadItem[];
	states: State[];
	/** UUID del caso de incorporación si esta empresa nació de un proceso. */
	incorporationId: string | null;
}

export interface CompanyManagementTypeHealth {
	ok: boolean;
	managementType: Managmentype | null;
	managers: number;
	reason?: string;
}

export interface State {
	id: number,
	name: String,
	code: String
}
