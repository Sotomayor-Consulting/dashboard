export type EntityType = 'company' | 'incorporation_case' | 'member';

export interface EntityFieldDescriptor {
	name: string;
	label: string;
	type: 'text' | 'date' | 'enum' | 'number' | 'email' | 'boolean';
	description?: string;
	enumValues?: string[];
	nullable?: boolean;
	bridgeTable?: 'company_members';
}

const companyFields: EntityFieldDescriptor[] = [
	{ name: 'company_name', label: 'Company Name', type: 'text', description: 'Nombre legal de la empresa' },
	{ name: 'slug', label: 'Slug', type: 'text' },
	{ name: 'status', label: 'Estado', type: 'text' },
	{ name: 'created_at', label: 'Fecha de creación', type: 'date' },
];

const incorporationFields: EntityFieldDescriptor[] = [
	{ name: 'business_name_1', label: 'Nombre comercial (1)', type: 'text' },
	{ name: 'business_name_2', label: 'Nombre comercial (2)', type: 'text' },
	{ name: 'business_name_3', label: 'Nombre comercial (3)', type: 'text' },
	{ name: 'business_type', label: 'Tipo de negocio', type: 'text' },
	{ name: 'formation_state', label: 'Estado de incorporación', type: 'text' },
	{ name: 'management_type', label: 'Forma de administración', type: 'enum', enumValues: ['member-managed', 'manager-managed'] },
	{ name: 'taxation_type', label: 'Forma de tributación', type: 'text' },
	{ name: 'status', label: 'Estado del caso', type: 'text' },
	{ name: 'business_address', label: 'Dirección de la empresa', type: 'text' },
	{ name: 'us_address', label: 'Dirección en EEUU', type: 'text' },
	{ name: 'us_city', label: 'Ciudad (EEUU)', type: 'text' },
	{ name: 'us_state', label: 'Estado (EEUU)', type: 'text' },
	{ name: 'us_zip', label: 'Código postal (EEUU)', type: 'text' },
	{ name: 'us_county', label: 'Condado (EEUU)', type: 'text' },
	{ name: 'percentage', label: 'Porcentaje de incorporación', type: 'number' },
	{ name: 'source', label: 'Origen', type: 'text' },
	{ name: 'created_at', label: 'Fecha de creación', type: 'date' },
];

const memberFields: EntityFieldDescriptor[] = [
	{ name: 'full_name', label: 'Nombre completo', type: 'text' },
	{ name: 'first_name', label: 'Nombre', type: 'text' },
	{ name: 'last_name', label: 'Apellido', type: 'text' },
	{ name: 'birth_date', label: 'Fecha de nacimiento', type: 'date' },
	{ name: 'person_type', label: 'Tipo de persona', type: 'enum', enumValues: ['individual', 'entity'] },
	{ name: 'identification_number', label: 'Número de identificación', type: 'text' },
	{ name: 'identification_type', label: 'Tipo de identificación', type: 'text' },
	{ name: 'ssn', label: 'SSN', type: 'text' },
	{ name: 'itin', label: 'ITIN', type: 'text' },
	{ name: 'marital_status', label: 'Estado civil', type: 'enum', enumValues: ['single', 'married', 'divorced', 'widowed'] },
	{ name: 'percentage', label: 'Porcentaje de membresía', type: 'number', description: 'Requiere companyId', bridgeTable: 'company_members' },
	{ name: 'start_date', label: 'Fecha de inicio', type: 'date', description: 'Requiere companyId', bridgeTable: 'company_members' },
	{ name: 'end_date', label: 'Fecha de fin', type: 'date', description: 'Requiere companyId', bridgeTable: 'company_members' },
	{ name: 'is_manager', label: 'Es manager', type: 'boolean' },
	{ name: 'is_member', label: 'Es miembro', type: 'boolean' },
];

const ENTITY_FIELDS: Record<EntityType, EntityFieldDescriptor[]> = {
	company: companyFields,
	incorporation_case: incorporationFields,
	member: memberFields,
};

const ENTITY_LABELS: Record<EntityType, string> = {
	company: 'Empresa',
	incorporation_case: 'Incorporación',
	member: 'Miembro',
};

export function getEntityFields(entityType: EntityType): EntityFieldDescriptor[] {
	return ENTITY_FIELDS[entityType];
}

export function getEntityLabel(entityType: EntityType): string {
	return ENTITY_LABELS[entityType];
}

export function getAllEntityTypes(): EntityType[] {
	return Object.keys(ENTITY_FIELDS) as EntityType[];
}
