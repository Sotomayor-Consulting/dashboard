export const prerender = false;

import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '@infrastructure/supabase';
import { safeBack } from '@infrastructure/security/headers';

// Define la ruta a la que se redirige después de la operación (ajusta si es necesario)
const BACK_PATH = '/notifications';

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
	const back = safeBack(
		new URL(request.url).searchParams.get('back'),
		BACK_PATH,
	);

	// 1) Sesión y Usuario
	const supabase = createSupabaseServerClient({
		headers: request.headers,
		cookies,
	});

	const {
		data: { user },
		error: userErr,
	} = await supabase.auth.getUser();

	if (userErr || !user) {
		const msg = encodeURIComponent('No autenticado');
		return redirect(`${back}?status=error&msg=${msg}`);
	}

	// 2) Form data
	const form = await request.formData();

	// Extraemos los datos clave del formulario
	const notificationIdRaw = form.get('id')?.toString().trim();
	const estadoLecturaRaw = form.get('estado_lectura')?.toString().trim();

	if (!notificationIdRaw || !estadoLecturaRaw) {
		const msg = encodeURIComponent(
			'Faltan datos necesarios (ID o estado de lectura)',
		);
		return redirect(`${back}?status=error&msg=${msg}`);
	}

	// Convertimos el booleano string a booleano real para la lógica de Supabase
	const isRead = estadoLecturaRaw === 'true';

	// 3) Construir el Payload de Actualización
	// El estado de lectura se consolida en `read_at` (null = no leída).
	const payload = {
		read_at: isRead ? new Date().toISOString() : null,
	};

	// 4) Ejecutar el UPDATE
	// Usamos .update() para un UPDATE explícito basado en una condición WHERE
	const { error } = await supabase
		.schema('shared')
		.from('notifications')
		.update(payload)
		.eq('id', notificationIdRaw)
		.eq('user_id', user.id); // Prevenir IDOR: solo actualizar notificaciones del usuario autenticado

	// 5) Redirección
	if (error) {
		const msg = encodeURIComponent(`DB Update Error: ${error.message}`);
		return redirect(`${back}?status=error&msg=${msg}`);
	}

	const successMessage = isRead
		? '¡Éxito! Notificación marcada como leída.'
		: '¡Éxito! Estado de lectura actualizado.';

	const msg = encodeURIComponent(successMessage);
	return redirect(`${back}?status=success&msg=${msg}`);
};
