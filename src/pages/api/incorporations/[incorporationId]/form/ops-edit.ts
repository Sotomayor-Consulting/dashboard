import type { APIRoute } from 'astro';
import { jsonError, jsonSuccess } from '@infrastructure/auth/auth.helpers';
import { isAdmin, isOperaciones } from '@shared/roles';
import { opsEditFormPayload } from '@domains/workflow/incorporation-forms';

export const POST: APIRoute = async ({ params, locals, request }) => {
	const { incorporationId } = params;
	if (!incorporationId) return jsonError('Falta el ID de incorporación.', 400);

	const userRoles = locals.userRoles ?? [];
	if (!isAdmin(userRoles) && !isOperaciones(userRoles)) {
		return jsonError('No autorizado.', 403);
	}

	const userId = locals.user?.id;
	if (!userId) return jsonError('Sesión inválida.', 401);

	let body: { payload?: unknown };
	try {
		body = await request.json();
	} catch {
		return jsonError('JSON inválido.', 400);
	}

	if (!body.payload || typeof body.payload !== 'object') {
		return jsonError('Payload inválido.', 400);
	}

	const result = await opsEditFormPayload(incorporationId, body.payload);
	if (!result.ok) return jsonError(result.reason, 409);
	return jsonSuccess({ ok: true });
};
