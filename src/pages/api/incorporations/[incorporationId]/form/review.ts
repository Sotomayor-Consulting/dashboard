import type { APIRoute } from 'astro';
import { jsonError, jsonSuccess } from '@infrastructure/auth/auth.helpers';
import { isAdmin, isOperaciones } from '@shared/roles';
import {
	validateFormByOps,
	rejectFormByOps,
} from '@domains/workflow/incorporation-forms';

export const POST: APIRoute = async ({ params, locals, request }) => {
	const { incorporationId } = params;
	if (!incorporationId) return jsonError('Falta el ID de incorporación.', 400);

	const userRoles = locals.userRoles ?? [];
	if (!isAdmin(userRoles) && !isOperaciones(userRoles)) {
		return jsonError('No autorizado.', 403);
	}

	const userId = locals.user?.id;
	if (!userId) return jsonError('Sesión inválida.', 401);

	let body: { decision?: string; reason?: string };
	try {
		body = await request.json();
	} catch {
		return jsonError('JSON inválido.', 400);
	}

	const { decision, reason } = body;

	if (decision === 'validate') {
		const result = await validateFormByOps(incorporationId, userId);
		if (!result.ok) return jsonError(result.reason, 409);
		return jsonSuccess({ ok: true });
	}

	if (decision === 'reject') {
		if (!reason?.trim()) return jsonError('El motivo del rechazo es requerido.', 400);
		const result = await rejectFormByOps(incorporationId, reason.trim());
		if (!result.ok) return jsonError(result.reason, 409);
		return jsonSuccess({ ok: true });
	}

	return jsonError('Decisión inválida. Use "validate" o "reject".', 400);
};
