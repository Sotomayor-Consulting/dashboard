import type { CompanyEntityType, CompanyManagementType, CompanyLegalStatus, CompanyTaxClassification } from "@domains/companies/types/company";
import type { CompanyAddressType } from "@domains/companies/types/company-address";

export interface Country {
	id: number;
	iso: string;
	name: string;
	phone_code: string;
}

// ── incorporations (CRUD list row) ────────────────────
export interface CompanyCrudRow {
	id: string;
	principal_name: string;
	entity_type: string | null;
	porcentaje_de_incorporacion: number | null;
	estado: string | null;
	updated_at: string | null;
	created_by_name: string;
}

// ── Detail view types (incorporations + relations) ────
export interface EmpresaDetail {
	id: string;
	company_id: string | null;
	user_id: string;
	principal_name: string | null;
	possible_names: string[] | null;
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
	usuarios?: {
		nombre: string | null;
		apellido: string | null;
		correo: string | null;
	}[];
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
	type: CompanyAddressType;
	line1: string;
	line2: string | null;
	city: string;
	county: string | null;
	zip: string | null;
	country_id: number;
	state_id: number | null;
	country?: string | null;
	state?: string | null;
}

// ── members (master data) ───────────────────────────────────────
export type MemberPersonType = 'individual' | 'entity';

export type MemberIdentificationType =
	'passport' | 'drivers_license' | 'id' | 'ein';

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
	name: string | null;
	birth_date: string | null;
	incorporation_date: string | null;
	person_type: MemberPersonType;
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
	end_date: string | null;
	is_member: boolean;
	is_manager: boolean;
	is_active: boolean | null;
	created_at: string;
	member: MemberItem | null;
}

export interface CompanyItem {
	id: string;
	legal_name: string | null;
	filing_number: string | null;
	identification_number: string | null;
	entity_type: CompanyEntityType;
	formation_state_id: number | null;
	formation_country_id: number | null;
	tax_clasification: CompanyTaxClassification | null;
	management_type: CompanyManagementType;
	activity_code_id: number | null;
	activity_description: string | null;
	us_source_income?: boolean | null;
	joint_ownership?: boolean | null;
	incorporation_date?: string | null;
	irs_email?: string | null;
	legal_status: CompanyLegalStatus;
}

export interface ActividadItem {
	id: number;
	irs_code: string;
	name_es: string;
	name_en: string;
	category: {
		id: number;
		name: string;
		sector?: { id: number; name: string };
	};
}

export interface CompanyDetailData {
	empresa: EmpresaDetail;
	company: CompanyItem | null;
	socios: SocioItem[];
	addresses: CompanyAddressItem[];
	companyMembers: CompanyMemberItem[];
	managementTypeHealth: CompanyManagementTypeHealth | null;
	actividades: ActividadItem[];
	paises: Country[];
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
	managementType: CompanyManagementType | null;
	managers: number;
	reason?: string;
}

export interface State {
	id: number;
	name: String;
	code: String;
}
