// ─── Destinatarios para notificaciones de la etapa "Planning Meeting" ──
// Resolución de usuarios para las notificaciones generadas por el workflow:
//   - Cliente dueño de la incorporación.
//   - Equipo de operaciones (usuarios con rol 'operaciones').

import { supabaseAdmin } from '@infrastructure/supabase/admin';

export interface ClientRecipient {
	userId: string;
	companyName: string | null;
}

/**
 * Devuelve el cliente dueño de la empresa en incorporación.
 * Retorna null si la empresa no existe o no tiene user_id asignado.
 */
export async function getClientRecipientForCase(
	caseId: string,
): Promise<ClientRecipient | null> {
	const { data, error } = await supabaseAdmin
		.from('incorporations')
		.select('user_id, principal_name')
		.eq('id', caseId)
		.maybeSingle();

	if (error || !data?.user_id) return null;

	return {
		userId: data.user_id as string,
		companyName: (data.principal_name as string | null) ?? null,
	};
}

/**
 * Devuelve los user_id de todos los miembros del equipo de operaciones.
 * Vacío si no hay nadie con ese rol.
 */
export async function getOperationsTeamUserIds(): Promise<string[]> {
	const { data, error } = await supabaseAdmin
		.from('user_roles')
		.select('user_id, roles!inner(name)')
		.eq('roles.name', 'operaciones');

	if (error || !data) return [];

	const ids = new Set<string>();
	for (const row of data as Array<{ user_id: string | null }>) {
		if (row.user_id) ids.add(row.user_id);
	}
	return [...ids];
}
