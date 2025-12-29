// src/pages/api/test/usuario.ts
export const prerender = false;

import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';

const BACK_PATH = '/settings';

export const POST: APIRoute = async ({ request, cookies, redirect, url }) => {
	const back = url.searchParams.get('back') || BACK_PATH;

	// 1) Sesión
	const accessToken = cookies.get('sb-access-token');
	const refreshToken = cookies.get('sb-refresh-token');
	if (!accessToken || !refreshToken) {
		const msg = encodeURIComponent('No autenticado');
		return redirect(`${back}?status=error&msg=${msg}`);
	}

	await supabase.auth.setSession({
		access_token: accessToken.value,
		refresh_token: refreshToken.value,
	});

	// 2) Usuario
	const {
		data: { user },
		error: userErr,
	} = await supabase.auth.getUser();

	if (userErr || !user) {
		const msg = encodeURIComponent('No autenticado');
		return redirect(`${back}?status=error&msg=${msg}`);
	}

	// 3) Form data
	const form = await request.formData();

	// nombre / apellido (opcionales)
	const nombreRaw = form.get('nombre')?.toString().trim() ?? '';
	const apellidoRaw = form.get('apellido')?.toString().trim() ?? '';
	const paisIdRaw = form.get('pais')?.toString().trim() ?? '';
	const ciudadRaw = form.get('ciudad')?.toString().trim() ?? '';
	const direccionlinea1Raw = form.get('direccion')?.toString().trim() ?? '';
	const telefonoRaw = form.get('telefono')?.toString().trim() ?? '';
	const direccion_linea2Raw = form.get('direccion2')?.toString().trim() ?? '';
	const fecha_nacimientoRaw =
		form.get('fecha_nacimiento')?.toString().trim() ?? '';
	const organizacionRaw = form.get('organizacion')?.toString().trim() ?? '';
	const cargoRaw = form.get('cargo')?.toString().trim() ?? '';
	const departamentoRaw = form.get('departamento')?.toString().trim() ?? '';
	const codigo_postalRaw = form.get('codigo_postal')?.toString().trim() ?? '';
	const tipo_identificacionRaw =
		form.get('tipo_de_documento')?.toString().trim() ?? '';
	const numero_de_identificacionRaw =
		form.get('Numero_de_identificacion')?.toString().trim() ?? '';
	const tipo_personaRaw = form.get('tipo_de_persona')?.toString().trim() ?? '';

	// 4) Payload dinámico: solo incluimos los campos con valor
	const payload: Record<string, any> = {
		user_id: user.id,
	};
	if (nombreRaw) payload.nombre = nombreRaw;
	if (apellidoRaw) payload.apellido = apellidoRaw;
	if (paisIdRaw) payload.pais_id = paisIdRaw;
	if (ciudadRaw) payload.ciudad = ciudadRaw;
	if (direccionlinea1Raw) payload.direccion_linea1 = direccionlinea1Raw;
	if (direccion_linea2Raw) payload.direccion_linea2 = direccion_linea2Raw;
	if (telefonoRaw) payload.telf = telefonoRaw;
	if (fecha_nacimientoRaw) payload.fecha_nacimiento = fecha_nacimientoRaw;
	if (organizacionRaw) payload.organizacion = organizacionRaw;
	if (cargoRaw) payload.cargo = cargoRaw;
	if (departamentoRaw) payload.departamento = departamentoRaw;
	if (codigo_postalRaw) payload.codigo_postal = codigo_postalRaw;
	if (tipo_identificacionRaw)
		payload.tipo_identificacion = tipo_identificacionRaw;
	if (numero_de_identificacionRaw)
		payload.numero_de_identificacion = numero_de_identificacionRaw;
	if (tipo_personaRaw) payload.tipo_persona = tipo_personaRaw;

	// 5) Upsert por user_id (sin duplicar filas)
	const { error } = await supabase
		.from('usuarios')
		.upsert(payload, { onConflict: 'user_id' });

	if (error) {
		const msg = encodeURIComponent(`DB: ${error.message}`);
		return redirect(`${back}?status=error&msg=${msg}`);
	}

	const msg = encodeURIComponent('Datos guardados/actualizados');
	return redirect(`${back}?status=success&msg=${msg}`);
};
