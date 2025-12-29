export const prerender = false;

import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';

// Define la ruta a la que se redirige después de la operación (ajusta si es necesario)
const BACK_PATH = '/notificaciones'; // <-- AJUSTA ESTA RUTA

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
	const back = new URL(request.url).searchParams.get('back') || BACK_PATH;

	// 1) Sesión y Usuario (Mismo chequeo que tu ejemplo)
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
	const payload: Record<string, any> = {
		is_read: isRead,
		// Si se marca como leído (true), establecemos la fecha de lectura como ahora.
		// Si se marca como NO leído (false), se recomienda enviar NULL o no incluirlo.
	};

	// Si el estado es 'true' (marcar como leído), añadimos el timestamp.
	// NOTA: Supabase maneja `NOW()` automáticamente si no envías el campo, pero
	// enviarlo explícitamente aquí es más claro para el código JS.
	if (isRead) {
		// Usamos la función nativa de PostgreSQL 'now()'
		payload.leido_en = new Date().toISOString(); // O podrías usar 'now()' si Supabase lo espera así
	} else {
		// Opcional: Si se desmarca, forzamos que 'leido_en' sea NULL
		payload.leido_en = null;
	}

	// 4) Ejecutar el UPDATE
	// Usamos .update() para un UPDATE explícito basado en una condición WHERE
	const { error } = await supabase
		.from('notifications')
		.update(payload)
		.eq('id', notificationIdRaw); // ¡Usamos el ID de la fila para el WHERE!

	// 5) Redirección
	if (error) {
		const msg = encodeURIComponent(`DB Update Error: ${error.message}`);
		return redirect(`${back}?status=error&msg=${msg}`);
	}

	const successMessage = isRead
		? '✅ ¡Éxito! Notificación marcada como leída.'
		: '✅ ¡Éxito! Estado de lectura actualizado.';

	const msg = encodeURIComponent(successMessage);
	return redirect(`${back}?status=success&msg=${msg}`);
};
