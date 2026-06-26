export const prerender = false;

import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '@infrastructure/supabase';

const FALLBACK_BACK = '/settings';

export const POST: APIRoute = async ({ request, cookies, redirect, url }) => {
	// 0) Intentamos tomar slug lo antes posible (por query)
	let slug = url.searchParams.get('slug')?.toString().trim() || '';

	// Helper para construir el back según tengamos slug o no
	const backPath = () =>
		(slug ? `/incorporations/${slug}/settings` : FALLBACK_BACK);

	// 1) Sesión
	const supabase = createSupabaseServerClient({ headers: request.headers, cookies });

	// 2) Usuario
	const {
		data: { user },
		error: userErr,
	} = await supabase.auth.getUser();

	if (userErr || !user) {
		const msg = encodeURIComponent('No autenticado');
		return redirect(`${backPath()}?status=error&msg=${msg}`);
	}

	// 3) Form data (aquí ya podemos sobreescribir slug si viene en el hidden)
	const form = await request.formData();
	slug = form.get('slug')?.toString().trim() || slug; // 👈 hidden <input name="slug" />

	// Campos opcionales
	const nombreRaw = form.get('nombre')?.toString().trim() ?? '';
	const apellidoRaw = form.get('apellido')?.toString().trim() ?? '';
	const paisIdRaw = form.get('pais')?.toString().trim() ?? '';
	const ciudadRaw = form.get('ciudad')?.toString().trim() ?? '';
	const direccionlinea1Raw = form.get('direccion')?.toString().trim() ?? '';
	const telefonoRaw = form.get('telefono')?.toString().trim() ?? '';
	const direccion_linea2Raw = form.get('direccion2')?.toString().trim() ?? '';
	const fecha_nacimientoRaw =
		form.get('fecha_nacimiento')?.toString().trim() ?? '';
	const departamentoRaw = form.get('departamento')?.toString().trim() ?? '';
	const codigo_postalRaw = form.get('codigo_postal')?.toString().trim() ?? '';

	// 4) Payload dinámico: solo incluimos los campos con valor
	const payload: Record<string, any> = { user_id: user.id };
	if (nombreRaw) payload.nombre = nombreRaw;
	if (apellidoRaw) payload.apellido = apellidoRaw;
	if (paisIdRaw) payload.pais_id = paisIdRaw;
	if (ciudadRaw) payload.ciudad = ciudadRaw;
	if (direccionlinea1Raw) payload.direccion_linea1 = direccionlinea1Raw;
	if (direccion_linea2Raw) payload.direccion_linea2 = direccion_linea2Raw;
	if (telefonoRaw) payload.telf = telefonoRaw;
	if (fecha_nacimientoRaw) payload.fecha_nacimiento = fecha_nacimientoRaw;
	if (departamentoRaw) payload.departamento = departamentoRaw;
	if (codigo_postalRaw) payload.codigo_postal = codigo_postalRaw;

	// 5) Upsert por user_id (sin duplicar filas)
	const { error } = await supabase
		.from('usuarios')
		.upsert(payload, { onConflict: 'user_id' });

	if (error) {
		const msg = encodeURIComponent(`DB: ${error.message}`);
		return redirect(`${backPath()}?status=error&msg=${msg}`);
	}

	const msg = encodeURIComponent('Datos guardados/actualizados');
	return redirect(`${backPath()}?status=success&msg=${msg}`);
};
