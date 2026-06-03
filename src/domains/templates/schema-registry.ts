import type { FieldMapping } from './types';
import { supabaseAdmin } from '@infrastructure/supabase/admin';

export type { EntityType, EntityFieldDescriptor } from './entity-registry';
export { getEntityFields, getEntityLabel, getAllEntityTypes } from './entity-registry';

export const ENTITY_TABLES: Record<string, string> = {
	company: 'empresa',
	incorporation_case: 'empresas_incorporaciones',
	member: 'members',
	planning_design_report: 'workflow.planning_design_reports',
};

export const ENTITY_PK: Record<string, string> = {
	company: 'empresa_id',
	incorporation_case: 'empresa_incorporacion_id',
	member: 'id',
	planning_design_report: 'incorporation_id',
};

const ENTITY_QUERY_MAP: Record<string, Record<string, string>> = {
	company: {
		company_name: 'nombre',
		slug: 'slug',
		status: 'estado',
		created_at: 'created_at',
	},
	incorporation_case: {
		business_name_1: 'nombre_1',
		business_name_2: 'nombre_2',
		business_name_3: 'nombre_3',
		business_type: 'tipo_de_negocio',
		formation_state: 'estado_de_incorporacion',
		management_type: 'forma_administracion',
		taxation_type: 'forma_tributacion',
		status: 'estado',
		business_address: 'direccion_empresa',
		us_address: 'direccion_eeuu',
		us_city: 'ciudad_eeuu',
		us_state: 'estado_eeuu',
		us_zip: 'codigo_postal_eeuu',
		us_county: 'condado_eeuu',
		percentage: 'porcentaje_de_incorporacion',
		source: 'source',
		created_at: 'created_at',
	},
	member: {
		full_name: 'full_name',
		first_name: 'first_name',
		last_name: 'last_name',
		birth_date: 'birth_date',
		person_type: 'person_type',
		identification_number: 'identification_number',
		identification_type: 'identification_type',
		ssn: 'ssn',
		itin: 'itin',
		marital_status: 'marital_status',
		is_manager: 'is_manager',
		is_member: 'is_member',
	},
	planning_design_report: {
		pd_state_id: 'state_id',
		pd_activity_id: 'activity_id',
		pd_confidentiality: 'confidentiality',
		pd_administration_form: 'administration_form',
		pd_tax_tributation: 'tax_tributation',
		pd_accounting_method: 'accounting_method',
		pd_members_number: 'members_number',
		pd_income_us: 'income_us',
		pd_designated_manager: 'designated_manager',
		pd_company_description: 'company_description',
		pd_meeting_resume: 'meeting_resume',
	},
};

// Bridge fields: live in company_members (per-membership), not in members.
// Need both memberId (entityId) AND companyId via contextIds.
const MEMBER_BRIDGE_MAP: Record<string, string> = {
	percentage: 'percentage',
	start_date: 'start_date',
	end_date: 'end_date',
};

export interface ResolveContextIds {
	companyId?: string;
}

function formatDate(raw: string): string {
	const date = new Date(raw);
	if (Number.isNaN(date.getTime())) return raw;
	const month = String(date.getUTCMonth() + 1).padStart(2, '0');
	const day = String(date.getUTCDate()).padStart(2, '0');
	const year = date.getUTCFullYear();
	return `${month}/${day}/${year}`;
}

function applyTransform(raw: unknown, transform: FieldMapping[string]['transform']): string {
	if (raw == null) return '';
	let value = String(raw);
	switch (transform) {
		case 'uppercase':
			value = value.toUpperCase();
			break;
		case 'lowercase':
			value = value.toLowerCase();
			break;
		case 'date':
			value = formatDate(value);
			break;
		default:
			break;
	}
	return value;
}

export async function resolveFieldData(
	entityType: string,
	entityId: string,
	fieldMapping: FieldMapping,
	contextIds?: ResolveContextIds,
): Promise<Record<string, string | boolean | string[]>> {
	const tableName = ENTITY_TABLES[entityType];
	const pkColumn = ENTITY_PK[entityType];
	const columnMap = ENTITY_QUERY_MAP[entityType];

	if (!tableName || !pkColumn || !columnMap) {
		throw new Error(`Unknown entity type: ${entityType}`);
	}

	const directPaths = new Set<string>();
	const bridgePaths = new Set<string>();

	for (const mapping of Object.values(fieldMapping)) {
		if (mapping.source !== entityType || !mapping.path) continue;
		if (entityType === 'member' && MEMBER_BRIDGE_MAP[mapping.path]) {
			bridgePaths.add(MEMBER_BRIDGE_MAP[mapping.path]!);
			continue;
		}
		const col = columnMap[mapping.path];
		if (col) directPaths.add(col);
	}

	let entityData: Record<string, unknown> = {};
	if (directPaths.size > 0) {
		const { data, error } = await supabaseAdmin
			.from(tableName)
			.select([...directPaths].join(','))
			.eq(pkColumn, entityId)
			.maybeSingle();

		if (error) {
			throw new Error(`Failed to resolve ${entityType}/${entityId}: ${error.message}`);
		}
		if (data) entityData = data as unknown as Record<string, unknown>;
	}

	let bridgeData: Record<string, unknown> = {};
	if (bridgePaths.size > 0) {
		if (!contextIds?.companyId) {
			throw new Error(
				'BRIDGE_CONTEXT_MISSING: member field requires companyId in contextIds',
			);
		}
		const { data, error } = await supabaseAdmin
			.from('company_members')
			.select([...bridgePaths].join(','))
			.eq('member_id', entityId)
			.eq('company_id', contextIds.companyId)
			.is('deleted_at', null)
			.eq('is_active', true)
			.maybeSingle();

		if (error) {
			throw new Error(
				`Failed to resolve company_members for member=${entityId} company=${contextIds.companyId}: ${error.message}`,
			);
		}
		if (data) bridgeData = data as unknown as Record<string, unknown>;
	}

	const result: Record<string, string | boolean | string[]> = {};

	for (const [pdfField, mapping] of Object.entries(fieldMapping)) {
		if (mapping.source === 'static') {
			result[pdfField] = mapping.static_value ?? '';
			continue;
		}

		if (mapping.source !== entityType || !mapping.path) continue;

		const isBridge = entityType === 'member' && MEMBER_BRIDGE_MAP[mapping.path];
		const column = isBridge ? MEMBER_BRIDGE_MAP[mapping.path]! : columnMap[mapping.path];
		if (!column) continue;

		const value = isBridge ? bridgeData[column] : entityData[column];
		if (value == null) continue;

		result[pdfField] = applyTransform(value, mapping.transform);
	}

	return result;
}

export async function fetchEntityRow(
	entityType: string,
	entityId: string,
): Promise<Record<string, unknown>> {
	const tableName = ENTITY_TABLES[entityType];
	const pkColumn = ENTITY_PK[entityType];

	if (!tableName || !pkColumn) {
		throw new Error(`Unknown entity type: ${entityType}`);
	}

	const { data, error } = await supabaseAdmin
		.from(tableName)
		.select('*')
		.eq(pkColumn, entityId)
		.maybeSingle();

	if (error) {
		throw new Error(`Failed to fetch ${entityType}/${entityId}: ${error.message}`);
	}

	return (data ?? {}) as Record<string, unknown>;
}
