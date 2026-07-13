/**
 * Tipo de `public.usuarios` — registro de usuario a nivel de aplicación
 * (FK a `auth.users.id` vía `user_id`). Tabla en español por convención
 * del proyecto; los nombres en código/path/queries van en inglés.
 */
export const USUARIO_COLUMNS = {
	BASE: 'user_id, nombre, apellido, correo, avatar_url',
} as const;

export interface UsuarioRow {
	user_id: string;
	nombre: string | null;
	apellido: string | null;
	correo: string | null;
	avatar_url: string | null;
}
