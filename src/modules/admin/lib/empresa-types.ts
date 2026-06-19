/**
 * Tipos del módulo Empresas (entidades legales formadas).
 * Mapea `public.companies` — la empresa real ya constituida vs.
 * `incorporations` que es el proceso de incorporación.
 */

export const ENTITY_TYPE = ['llc', 'corp', 'c-corp', 's-corp'] as const;
export type EntityType = (typeof ENTITY_TYPE)[number];

export const LEGAL_STATUS = [
	'draft',
	'active',
	'suspended',
	'dissolved',
] as const;
export type LegalStatus = (typeof LEGAL_STATUS)[number];

export const EMPRESAS_FILTERS = [
	'todas',
	'activas',
	'draft',
	'suspended',
] as const;
export type EmpresasFilter = (typeof EMPRESAS_FILTERS)[number];

export interface AdminEmpresaOwner {
	id: string;
	name: string;
	email: string;
	avatarUrl: string | null;
}

export interface AdminEmpresa {
	/** UUID de `companies.id`. */
	id: string;
	legalName: string;
	entityType: EntityType | null;
	formationState: string | null; // nombre legible del state
	filingNumber: string | null;
	/** EIN — `identification_number` en DB. */
	ein: string | null;
	incorporationDate: string | null;
	legalStatus: LegalStatus;
	taxClassification: string | null;
	managementType: string | null;
	usSourceIncome: boolean;
	owner: AdminEmpresaOwner | null;
	/** UUID del registro de incorporación origen, si existe. */
	incorporationId: string | null;
	createdAt: string | null;
	updatedAt: string | null;
}

export interface AdminEmpresaMember {
	id: string;
	fullName: string;
	email: string | null;
	percentage: number | null;
	isManager: boolean;
}

export interface AdminEmpresaDetail extends AdminEmpresa {
	members: AdminEmpresaMember[];
	addresses: Array<{
		id: string;
		type: string | null;
		line1: string | null;
		city: string | null;
		state: string | null;
		zip: string | null;
	}>;
}
