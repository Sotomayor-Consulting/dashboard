// src/pages/api/auth/save-data.ts
// ─── Thin handler: Save Data (pre-auth business data) ───
export const prerender = false;

import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '@lib/supabase';
import { AuthService, redirectWithMessage } from '@lib/auth';

const BACK_PATH = '/start/';

export const POST: APIRoute = async ({ request, cookies, redirect, url }) => {
	try {
		const back = url.searchParams.get('back') ?? BACK_PATH;

		// Verificar si ya tiene sesión activa
		const supabase = createSupabaseServerClient({
			headers: request.headers,
			cookies,
		});
		const auth = new AuthService(supabase, cookies);
		const user = await auth.getCurrentUser();

		if (user) {
			return redirect('/');
		}

		// Extraer y validar datos del formulario
		const form = await request.formData();
		const tipoDeEmpresa = form.get('tipo_de_empresa')?.toString();
		const estadoDeEmpresa = form.get('estado_de_empresa')?.toString();
		const nombre1 = form.get('nombre_1')?.toString();
		const nombre2 = form.get('nombre_2')?.toString();
		const nombre3 = form.get('nombre_3')?.toString();

		if (!tipoDeEmpresa) {
			return redirectWithMessage(
				redirect,
				'El tipo de empresa es obligatorio.',
				'error',
				back,
			);
		}
		if (!estadoDeEmpresa) {
			return redirectWithMessage(
				redirect,
				'El estado de incorporación es obligatorio.',
				'error',
				back,
			);
		}
		if (!nombre1 || !nombre2 || !nombre3) {
			return redirectWithMessage(
				redirect,
				'Los tres nombres son obligatorios.',
				'error',
				back,
			);
		}

		// OK — el cliente guarda en localStorage
		return redirect(`${back}?status=auth_required`);
	} catch {
		return redirectWithMessage(
			redirect,
			'Error inesperado.',
			'error',
			BACK_PATH,
		);
	}
};
