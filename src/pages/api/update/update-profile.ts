// src/pages/api/update/update-profile.ts
export const prerender = false;

import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '@lib/supabase';

const BACK_PATH = '/settings';

export const POST: APIRoute = async ({ request, cookies, redirect, url, locals }) => {
	const back = url.searchParams.get('back') || BACK_PATH;

	// Crear cliente Supabase para este request
	const supabase = createSupabaseServerClient({ headers: request.headers, cookies });

	// Usuario ya verificado por el middleware
	const user = locals?.user;
	if (!user) {
		const msg = encodeURIComponent('No autenticado');
		return redirect(`${back}?status=error&msg=${msg}`);
	}

	// Form data
	const form = await request.formData();

	// Campos opcionales
	const payload: Record<string, any> = { user_id: user.id };

	const campos = {
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

	for (const [formKey, dbKey] of Object.entries(campos)) {
		const value = form.get(formKey)?.toString()?.trim();
		if (value) payload[dbKey] = value;
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
