import { supabaseAdmin } from '@infrastructure/supabase/admin';
import { ROLES } from '@shared/roles';

export interface CaseRecipient {
	userId: string;
	companyName: string | null;
}

/**
 * Devuelve el cliente dueño de la empresa para notificarle al cliente.
 */
export const getClientRecipientForCase = async (
	caseId: string,
): Promise<CaseRecipient | null> => {
	const { data, error } = await supabaseAdmin
		.from('empresas_incorporaciones')
		.select('user_id, nombre_1')
		.eq('empresa_incorporacion_id', caseId)
		.maybeSingle();

	if (error || !data?.user_id) return null;
	return { userId: data.user_id, companyName: data.nombre_1 ?? null };
};

/**
 * Devuelve los userIds del equipo de operaciones (rol `operaciones`).
 * Útil para notificar al equipo cuando el cliente aprueba o rechaza.
 */
export const getOperationsTeamUserIds = async (): Promise<string[]> => {
	const { data, error } = await supabaseAdmin
		.from('user_roles')
		.select('user_id, roles!inner(name)')
		.eq('roles.name', ROLES.OPERACIONES);

	if (error || !data) return [];
	return data
		.map((row) => (row as { user_id: string | null }).user_id)
		.filter((id): id is string => typeof id === 'string');
};
