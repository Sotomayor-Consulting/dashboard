export type IncorporationEntityType = 'llc' | 'lp' | 'c-corp'

export const INCORPORATION_COLUMNS = {
	BASE: 'id, user_id, principal_name, possible_names, entity_type, state, formation_state_id, porcentaje_de_incorporacion, odoo_sale_order_id, source, updated_at',
	WITH_USER:
		'*, usuarios:user_id (nombre, apellido, correo)',
	WITH_STATE:
		'id, principal_name, possible_names, entity_type, state, formation_state_id, updated_at, formation_state:formation_state_id(name)',
	WITH_USER_AND_STATE:
		'*, usuarios:user_id (nombre, apellido, correo), formation_state:formation_state_id(name)',
	LIST: `user_id, id, entity_type, state, principal_name, possible_names, updated_at, porcentaje_de_incorporacion`,
	LIST_WITH_USER: `user_id, id, entity_type, state, principal_name, possible_names, updated_at, porcentaje_de_incorporacion, usuarios:user_id (nombre, apellido)`,
	PROGRESS:
		'user_id, id, entity_type, state, principal_name, possible_names, updated_at',
} as const;

export interface IncorporationRow {
	id: string;
	user_id: string;
	principal_name: string | null;
	possible_names: string[] | null;
	entity_type: IncorporationEntityType;
	state: string | null;
	formation_state_id: number | null;
	porcentaje_de_incorporacion: number | null;
	odoo_sale_order_id: number | null;
	source: string | null;
	company_id: string | null;
	updated_at: string | null;
}

export interface IncorporationWithUser extends IncorporationRow {
	usuarios?: { nombre: string | null; apellido: string | null; correo: string | null } | { nombre: string | null; apellido: string | null; correo: string | null }[];
}

export interface IncorporationWithState extends IncorporationRow {
	formation_state: { name: string } | { name: string }[] | null;
}

export interface IncorporationWithUserAndState extends IncorporationWithUser {
	formation_state: { name: string } | { name: string }[] | null;
}

export type IncorporationInsert = Omit<IncorporationRow, 'id' | 'updated_at'> & {
	user_id: string;
};

export type IncorporationUpdate = Partial<IncorporationInsert>;
