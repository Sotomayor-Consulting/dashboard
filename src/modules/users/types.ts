export type EntityId = string | number;

export interface PaisItem {
	id: EntityId;
	name: string;
}

export interface RolItem {
	id: EntityId;
	name: string;
}

export interface UserRoleItem {
	user_id: string;
	rol_id: EntityId;
	roles?: {
		name?: string | null;
	} | null;
}

export interface UsuarioItem {
	user_id: string;
	nombre?: string | null;
	apellido?: string | null;
	correo?: string | null;
	avatar_url?: string | null;
	organizacion?: string | null;
	cargo?: string | null;
	estado?: string | null;
	pais_id?: EntityId | null;
	countries?: {
		id: EntityId;
		name: string;
	} | null;
	ciudad?: string | null;
	direccion_linea1?: string | null;
	direccion_linea2?: string | null;
	telf?: string | null;
	fecha_nacimiento?: string | null;
	tipo_identificacion?: string | null;
	numero_de_identificacion?: string | null;
	tipo_persona?: string | null;
}

export interface UsersPageData {
	usuarios: UsuarioItem[];
	roles: RolItem[];
	paises: PaisItem[];
	rolesGeneral: UserRoleItem[];
}
