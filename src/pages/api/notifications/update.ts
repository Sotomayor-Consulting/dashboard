export const prerender = false;

import type { APIRoute } from 'astro';
import { createLogger } from '@infrastructure/logging';
import { supabaseAdmin } from '@infrastructure/supabase/admin';
import { createSupabaseServerClient } from '@infrastructure/supabase';
import { safeBack } from '@infrastructure/security/headers';

// Define la ruta a la que se redirige después de la operación (ajusta si es necesario)
const BACK_PATH = '/notifications';
const log = createLogger('api.notifications.update');

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
	new Response(JSON.stringify(body), {
		status,
		headers: {
			'content-type': 'application/json; charset=utf-8',
		},
	});

export const GET: APIRoute = async ({ request, redirect }) => {
	const back = safeBack(
		new URL(request.url).searchParams.get('back'),
		BACK_PATH,
	);

	return redirect(back);
};

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
	const back = safeBack(
		new URL(request.url).searchParams.get('back'),
		BACK_PATH,
	);
	const wantsJson =
		request.headers.get('x-requested-with') === 'XMLHttpRequest' ||
		request.headers.get('accept')?.includes('application/json');

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
		if (wantsJson) {
			return jsonResponse({ ok: false, error: 'No autenticado' }, 401);
		}

		const msg = encodeURIComponent('No autenticado');
		return redirect(`${back}?status=error&msg=${msg}`);
	}

	// 2) Form data
	const form = await request.formData();

	// Extraemos los datos clave del formulario
	const notificationIdRaw = form.get('id')?.toString().trim();
	const estadoLecturaRaw = form.get('estado_lectura')?.toString().trim();

	if (!notificationIdRaw || !estadoLecturaRaw) {
		if (wantsJson) {
			return jsonResponse(
				{ ok: false, error: 'Faltan datos necesarios (ID o estado de lectura)' },
				400,
			);
		}

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
	const { error } = await supabaseAdmin
		.schema('shared')
		.from('notifications')
		.update(payload)
		.eq('id', notificationIdRaw)
		.eq('user_id', user.id); // Prevenir IDOR: solo actualizar notificaciones del usuario autenticado

	// 5) Redirección
	if (error) {
		log.error('Notification update failed', {
			notificationId: notificationIdRaw,
			userId: user.id,
			message: error.message,
			code: error.code,
			details: error.details,
			hint: error.hint,
		});

		if (wantsJson) {
			return jsonResponse(
				{ ok: false, error: `DB Update Error: ${error.message}` },
				500,
			);
		}

		const msg = encodeURIComponent(`DB Update Error: ${error.message}`);
		return redirect(`${back}?status=error&msg=${msg}`);
	}

	const successMessage = isRead
		? '¡Éxito! Notificación marcada como leída.'
		: '¡Éxito! Estado de lectura actualizado.';

	if (wantsJson) {
		return jsonResponse({ ok: true, message: successMessage });
	}

	const msg = encodeURIComponent(successMessage);
	return redirect(`${back}?status=success&msg=${msg}`);
};
