export const prerender = false;

import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '@infrastructure/supabase';
import { safeBack } from '@infrastructure/security/headers';

const BACK_PATH = '/users/';

export const POST: APIRoute = async ({ request, cookies, redirect, url }) => {
	const back = safeBack(url.searchParams.get('back'), BACK_PATH);

	// 1) Cliente per-request con contexto de cookies
	const supabase = createSupabaseServerClient({
		headers: request.headers,
		cookies,
	});

	// 2) Actor + verificación admin
	const {
		data: { user },
		error: userErr,
	} = await supabase.auth.getUser();
	if (userErr || !user) {
		return redirect(
			`${back}?status=error&msg=${encodeURIComponent('No autenticado')}`,
		);
	}
	const { data: isAdminRes, error: rpcErr } = await supabase.rpc('is_admin', {
		uid: user.id,
	});
	const isAdmin = !rpcErr && Boolean(isAdminRes);
	if (!isAdmin) {
		return redirect(
			`${back}?status=error&msg=${encodeURIComponent('No autorizado')}`,
		);
	}

	// 3) Leer form
	const form = await request.formData();

	// user_id es REQUERIDO: UUID de auth.users del usuario a dar de alta
	const userId = form.get('user_id')?.toString();
	if (!userId) {
		return redirect(
			`${back}?status=error&msg=${encodeURIComponent('Falta user_id (UUID de auth.users)')}`,
		);
	}

	// Campos opcionales del perfil
	const nombre = form.get('nombre_create')?.toString().trim();
	const apellido = form.get('apellido_create')?.toString().trim();
	const correo = form.get('correo_create')?.toString().trim();
	// rol (admin puede establecerlo)
	const rolIdRaw = form.get('rol_id_create')?.toString();
	const rol_id =
		rolIdRaw && !Number.isNaN(Number(rolIdRaw)) ? Number(rolIdRaw) : undefined;

	// 4) Armar payload
	const payload: Record<string, any> = { user_id: userId };
	if (nombre) payload.nombre = nombre;
	if (apellido) payload.apellido = apellido;
	if (correo) payload.correo = correo;
	if (rol_id !== undefined) payload.rol_id = rol_id;

	// 5) Inserción
	const { error } = await supabase.from('usuarios').insert(payload);

	if (error) {
		const msg = encodeURIComponent(`DB: ${error.message}`);
		return redirect(`${back}?status=error&msg=${msg}`);
	}

	return redirect(
		`${back}?status=success&msg=${encodeURIComponent('Usuario creado')}`,
	);
};
