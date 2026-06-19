export const prerender = false;

import type { APIRoute } from 'astro';
import { z } from 'zod';

import { createSupabaseServerClient } from '@infrastructure/supabase';

const json = (status: number, payload: unknown) =>
	new Response(JSON.stringify(payload), {
		status,
		headers: { 'Content-Type': 'application/json' },
	});

const bodySchema = z.object({
	empresa_incorporacion_id: z.string().min(1),
	nombre_1: z.string().max(120).optional(),
	nombre_2: z.string().max(120).optional(),
	nombre_3: z.string().max(120).optional(),
	estado_de_incorporacion: z.string().max(80).optional(),
});

/**
 * Actualiza la identidad (3 nombres + estado) de la incorporación del
 * propio cliente. Autorizado por propiedad de la fila (`user_id`).
 *
 * Usado por la Identity Card de la pantalla 1 del formulario del cliente.
 */
export const POST: APIRoute = async ({ request, cookies }) => {
	const supabase = createSupabaseServerClient({
		headers: request.headers,
		cookies,
	});

	const {
		data: { user },
		error: userErr,
	} = await supabase.auth.getUser();

	if (userErr || !user) {
		return json(401, { ok: false, error: 'No autenticado' });
	}

	const parsed = bodySchema.safeParse(await request.json().catch(() => null));
	if (!parsed.success) {
		return json(400, { ok: false, error: 'Datos inválidos' });
	}

	const { empresa_incorporacion_id: empresaId, ...rest } = parsed.data;

	// Solo persistimos los campos enviados. La opción preferida (nombre_1) es
	// el nombre canónico → principal_name; las 3 opciones se consolidan en
	// possible_names (trim, sin vacíos, deduplicado).
	const update: Record<string, unknown> = {};
	if (rest.nombre_1 !== undefined)
		update.principal_name = rest.nombre_1.trim() || null;
	if (
		rest.nombre_1 !== undefined ||
		rest.nombre_2 !== undefined ||
		rest.nombre_3 !== undefined
	) {
		update.possible_names = [
			...new Set(
				[rest.nombre_1, rest.nombre_2, rest.nombre_3]
					.map((n) => n?.trim())
					.filter((n): n is string => Boolean(n)),
			),
		];
	}
	// estado_de_incorporacion: columna eliminada de incorporations. El estado
	// US ahora vive en formation_state_id (FK), pero la Identity Card envía el
	// nombre del estado, no el id → persistencia degradada hasta re-cablear.

	if (Object.keys(update).length === 0) {
		return json(400, { ok: false, error: 'Nada que actualizar' });
	}

	const { error } = await supabase
		.from('incorporations')
		.update(update)
		.eq('id', empresaId)
		.eq('user_id', user.id); // solo su propia incorporación

	if (error) {
		return json(500, { ok: false, error: error.message });
	}

	return json(200, { ok: true });
};
