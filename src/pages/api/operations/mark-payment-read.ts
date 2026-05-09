// src/pages/api/update/operaciones-update-lectura-de-pagos.ts
export const prerender = false;

import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '@infrastructure/supabase';
import { safeBack } from '@infrastructure/security/headers';

const BACK_PATH = '/admin/pagos/';

export const POST: APIRoute = async ({ request, cookies, redirect, url }) => {
	const back = safeBack(url.searchParams.get('back'), BACK_PATH);

	try {
		// 1) Sesión
		const supabase = createSupabaseServerClient({ headers: request.headers, cookies });

		// 2) Actor + check rol de operaciones
		const { data: { user: actor }, error: userErr } = await supabase.auth.getUser();
		if (userErr || !actor) {
			return redirect(
				`${back}?status=error&msg=${encodeURIComponent('No autenticado')}`,
			);
		}

		// Ya no necesitamos verificar rol aquí, la función SQL lo hará

		// 3) Form data
		const form = await request.formData();
		const pagoId = form.get('pago_id')?.toString();
		const marcarComoVisto = form.get('marcar_como_visto')?.toString();

		if (!pagoId) {
			return redirect(
				`${back}?status=error&msg=${encodeURIComponent('Falta ID del pago')}`,
			);
		}

		if (marcarComoVisto !== 'true') {
			return redirect(
				`${back}?status=error&msg=${encodeURIComponent('Valor inválido para marcar como visto')}`,
			);
		}

		// 4) Llamar a la función segura para actualizar

		const { data, error } = await supabase.rpc('mark_pago_visto_secure', {
			p_id: pagoId,
		});

		if (error) {
			const msg = encodeURIComponent(`DB: ${error.message}`);
			return redirect(`${back}?status=error&msg=${msg}`);
		}

		// Verificar el resultado de la función (retorna boolean)
		if (!data) {
			const msg = encodeURIComponent('No se pudo marcar el pago como visto');
			return redirect(`${back}?status=error&msg=${msg}`);
		}

		return redirect(
			`${back}?status=success&msg=${encodeURIComponent('Pago marcado como visto')}`,
		);
	} catch (e: any) {
		const msg = encodeURIComponent(`Error inesperado: ${e?.message ?? e}`);
		return redirect(`${back}?status=error&msg=${msg}`);
	}
};
