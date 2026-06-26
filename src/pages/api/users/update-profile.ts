export const prerender = false;

import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '@infrastructure/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
import { personalInfoSchema } from '@shared/schemas/personal-info.schema';
import {
	validateFormData,
	formDataToObject,
} from '@shared/validation/form-validator';
import { safeBack } from '@infrastructure/security/headers';
import { createLogger } from '@infrastructure/logging';

const log = createLogger('update-profile');

const BACK_PATH = '/settings';

export const GET: APIRoute = async ({ redirect, url }) => {
	const back = safeBack(url.searchParams.get('back'), BACK_PATH);
	return redirect(
		`${back}?status=error&msg=${encodeURIComponent('Metodo no permitido. Usa POST.')}`,
	);
};

/** Mapeo: nombre del campo en el form → nombre de columna en la BD */
const FIELD_TO_DB: Record<string, string> = {
	nombre: 'nombre',
	apellido: 'apellido',
	pais: 'pais_id',
	ciudad: 'ciudad',
	direccion: 'direccion_linea1',
	direccion2: 'direccion_linea2',
	telefono: 'telf',
	fecha_nacimiento: 'fecha_nacimiento',
	departamento: 'departamento',
	codigo_postal: 'codigo_postal',
	tipo_de_documento: 'tipo_identificacion',
	Numero_de_identificacion: 'numero_de_identificacion',
	tipo_de_persona: 'tipo_persona',
};

export const POST: APIRoute = async ({
	request,
	cookies,
	redirect,
	locals,
}) => {
	const back = safeBack(new URL(request.url).searchParams.get('back'), BACK_PATH);
	// Crear cliente Supabase para este request
	const supabase =
		(locals.supabase as SupabaseClient | undefined) ??
		createSupabaseServerClient({
			headers: request.headers,
			cookies,
		});

	// Usuario ya verificado por el middleware
	const user = locals?.user;
	if (!user) {
		log.warn('Usuario no autenticado en POST');
		const msg = encodeURIComponent('No autenticado');
		return redirect(`${back}?status=error&msg=${msg}`);
	}

	// Parsear y validar form data con Zod
	const form = await request.formData();
	const raw = formDataToObject(form);
	const result = validateFormData(personalInfoSchema, raw);

	if (!result.success) {
		log.warn('Validacion fallida', { fieldErrors: result.fieldErrors });
		// Tomar el primer error global para mostrarlo como mensaje
		const firstError = Object.values(result.fieldErrors)[0]?.[0]
			?? 'Datos inválidos';
		const msg = encodeURIComponent(firstError);
		return redirect(`${back}?status=error&msg=${msg}`);
	}

	// Construir payload mapeando nombres de form → nombres de BD
	const payload: Record<string, string> = { user_id: user.id };
	for (const [formKey, value] of Object.entries(result.data)) {
		const dbKey = FIELD_TO_DB[formKey];
		if (dbKey && value) {
			payload[dbKey] = value;
		}
	}

	const telefono = raw.telefono;
	const telefonoDbKey = FIELD_TO_DB.telefono;
	if (typeof telefono === 'string' && telefonoDbKey) {
		payload[telefonoDbKey] = telefono;
	}

	// Upsert
	const { error } = await supabase
		.from('usuarios')
		.upsert(payload, { onConflict: 'user_id' });

	if (error) {
		log.error('Error en upsert usuarios', { error });
		const msg = encodeURIComponent(`Error: ${error.message}`);
		return redirect(`${back}?status=error&msg=${msg}`);
	}

	const msg = encodeURIComponent('Datos guardados');
	return redirect(`${back}?status=success&msg=${msg}`);
};
