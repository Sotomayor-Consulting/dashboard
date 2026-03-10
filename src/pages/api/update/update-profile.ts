// src/pages/api/update/update-profile.ts
export const prerender = false;

import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '@lib/supabase';
import { personalInfoSchema } from '@lib/schemas/personalInfo.schema';
import {
	validateFormData,
	formDataToObject,
} from '@lib/validation/formValidator';
import { safeBack } from '@lib/security/headers';

const BACK_PATH = '/settings';

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
	organizacion: 'organizacion',
	cargo: 'cargo',
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
	const supabase = createSupabaseServerClient({
		headers: request.headers,
		cookies,
	});

	// Usuario ya verificado por el middleware
	const user = locals?.user;
	if (!user) {
		const msg = encodeURIComponent('No autenticado');
		return redirect(`${back}?status=error&msg=${msg}`);
	}

	// Parsear y validar form data con Zod
	const form = await request.formData();
	const raw = formDataToObject(form);
	const result = validateFormData(personalInfoSchema, raw);

	if (!result.success) {
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

	// Upsert
	const { error } = await supabase
		.from('usuarios')
		.upsert(payload, { onConflict: 'user_id' });

	if (error) {
		const msg = encodeURIComponent(`Error: ${error.message}`);
		return redirect(`${back}?status=error&msg=${msg}`);
	}

	const msg = encodeURIComponent('Datos guardados');
	return redirect(`${back}?status=success&msg=${msg}`);
};
