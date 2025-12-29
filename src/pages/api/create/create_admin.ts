// src/pages/api/admin/usuarios/create.ts
export const prerender = false;

import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';

const BACK_PATH = '/crud/users';

export const POST: APIRoute = async ({ request, cookies, redirect, url }) => {
	const back = url.searchParams.get('back') || BACK_PATH;

	// 1) Sesión
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
	const organizacion = form.get('organizacion_create')?.toString().trim();

	// rol (admin puede establecerlo)
	const rolIdRaw = form.get('rol_id_create')?.toString();
	const rol_id =
		rolIdRaw && !Number.isNaN(Number(rolIdRaw)) ? Number(rolIdRaw) : undefined;

	// 4) Armar payload
	const payload: Record<string, any> = { user_id: userId };
	if (nombre) payload.nombre = nombre;
	if (apellido) payload.apellido = apellido;
	if (correo) payload.correo = correo;
	if (organizacion) payload.organizacion = organizacion;
	if (rol_id !== undefined) payload.rol_id = rol_id;

	// 5) Inserción (elige uno de los dos: INSERT puro o UPSERT)

	// A) INSERT puro (fallará si ya existe esa fila)
	const { error } = await supabase.from('usuarios').insert(payload);

	// // B) Si prefieres idempotencia, usa UPSERT (descomenta y comenta el INSERT de arriba)
	// const { error } = await supabase
	//   .from("usuarios")
	//   .upsert(payload, { onConflict: "user_id" });

	if (error) {
		const msg = encodeURIComponent(`DB: ${error.message}`);
		return redirect(`${back}?status=error&msg=${msg}`);
	}

	return redirect(
		`${back}?status=success&msg=${encodeURIComponent('Usuario creado')}`,
	);
};
