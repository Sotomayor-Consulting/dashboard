// src/pages/api/admin/usuarios/invite.ts
export const prerender = false;

import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

const BACK_PATH = '/crud/users';

export const POST: APIRoute = async ({ request, cookies, redirect, url }) => {
	const back = url.searchParams.get('back') || BACK_PATH;

	try {
		// 1) Verificar sesión con el cliente normal
		const at = cookies.get('sb-access-token');
		const rt = cookies.get('sb-refresh-token');
		if (!at || !rt) {
			return redirect(
				`${back}?status=error&msg=${encodeURIComponent('No autenticado')}`,
			);
		}

		await supabase.auth.setSession({
			access_token: at.value,
			refresh_token: rt.value,
		});

		const { data: userRes, error: userErr } = await supabase.auth.getUser();
		const actor = userRes?.user;
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
		const redirectTo = `${url.origin}/auth/callback`;

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
