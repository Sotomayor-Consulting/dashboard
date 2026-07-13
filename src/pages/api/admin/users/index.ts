import type { APIRoute } from 'astro';

import { listAdminUsers } from '@domains/admin/users';
import { supabaseAdmin } from '@infrastructure/supabase/admin';
import { canManageCompanyData } from '@shared/roles';

/**
 * GET /api/admin/users
 * Lista de usuarios para la tabla del panel admin.
 *
 * Autorización: solo staff (admin / gerencia / operaciones). La página
 * `/admin/usuarios` ya habilita a operaciones, así que el endpoint debe
 * autorizar al mismo grupo — antes solo verificaba autenticación.
 * Usa `locals.userRoles` (poblado por el middleware desde el JWT con fallback
 * a la tabla `user_roles`), la misma fuente que la página.
 *
 * Cliente: service role. El listado NO debe depender de las políticas RLS
 * por-usuario de `usuarios` (que solo conceden lectura total vía `is_admin()`);
 * con el cliente RLS, un usuario `operaciones` veía únicamente su propia fila
 * → lista vacía. El acceso queda acotado por el chequeo de rol de arriba.
 */
export const GET: APIRoute = async ({ locals }) => {
	if (!locals.user) {
		return new Response(JSON.stringify({ error: 'No autenticado' }), {
			status: 401,
		});
	}

	if (!canManageCompanyData(locals.userRoles ?? [])) {
		return new Response(JSON.stringify({ error: 'No autorizado' }), {
			status: 403,
		});
	}

	const users = await listAdminUsers(supabaseAdmin);

	return new Response(JSON.stringify(users), {
		status: 200,
		headers: { 'Content-Type': 'application/json' },
	});
};
