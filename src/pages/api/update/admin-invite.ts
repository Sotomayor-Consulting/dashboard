// src/pages/api/admin/usuarios/invite.ts
export const prerender = false;

import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '@lib/supabase';
import { supabaseAdmin } from '@lib/supabase/admin';
import { safeBack } from '@lib/security/headers';

const BACK_PATH = '/crud/users';

export const POST: APIRoute = async ({ request, cookies, redirect, url }) => {
	const back = safeBack(url.searchParams.get('back'), BACK_PATH);

	try {
		// 1) Sesión
		const supabase = createSupabaseServerClient({ headers: request.headers, cookies });

		const { data: { user: actor }, error: userErr } = await supabase.auth.getUser();
		if (userErr || !actor) {
			return redirect(
				`${back}?status=error&msg=${encodeURIComponent('No autenticado')}`,
			);
		}

		// 2) Verificar que es admin (sigues usando tu RPC)
		const { data: isAdminRes, error: rpcErr } = await supabase.rpc('is_admin', {
			uid: actor.id,
		});
		const isAdmin = !rpcErr && Boolean(isAdminRes);
		if (!isAdmin) {
			return redirect(
				`${back}?status=error&msg=${encodeURIComponent('No autorizado')}`,
			);
		}

		// 3) Obtener email del form
		const form = await request.formData();
		const email = form.get('correo_create')?.toString().trim();

		if (!email) {
			return redirect(
				`${back}?status=error&msg=${encodeURIComponent('Falta email del usuario a invitar')}`,
			);
		}

		// 4) Enviar invitación usando el cliente ADMIN (service_role)
		const redirectTo = `${url.origin}/api/auth/invite-callback`;

		const { error: inviteError } =
			await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
				redirectTo,
			});

		if (inviteError) {
			const msg = encodeURIComponent(
				`Error al enviar invitación: ${inviteError.message}`,
			);
			return redirect(`${back}?status=error&msg=${msg}`);
		}

		return redirect(
			`${back}?status=success&msg=${encodeURIComponent('Invitación enviada correctamente')}`,
		);
	} catch (e: any) {
		const msg = encodeURIComponent(`Error inesperado: ${e?.message ?? e}`);
		return redirect(`${back}?status=error&msg=${msg}`);
	}
};
