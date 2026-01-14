// src/pages/api/auth/forgot-password.ts
export const prerender = false;

import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';

const BACK_PATH = '/sign-in';

export const GET: APIRoute = async ({ redirect, url }) => {
	const back = url.searchParams.get('back') || BACK_PATH;
	return redirect(`${back}?status=info&msg=${encodeURIComponent('Usa el formulario para solicitar recuperación de contraseña')}`);
};

export const POST: APIRoute = async ({ request, redirect, url }) => {
	const back = url.searchParams.get('back') || BACK_PATH;

	try {
		// 1) Obtener email del form
		const form = await request.formData();
		const email = form.get('email')?.toString().trim();

		if (!email) {
			return redirect(
				`${back}?status=error&msg=${encodeURIComponent('El email es requerido')}`,
			);
		}

		// 2) Verificar si el email existe en Supabase usando listUsers
		const { data: users, error: userErr } = await supabase.auth.admin.listUsers();
		
		const userExists = users?.users?.some(user => user.email === email);
		
		if (userErr || !userExists) {
			// Por seguridad, no revelamos si el email existe o no
			return redirect(
				`${back}?status=success&msg=${encodeURIComponent('Si el email está registrado, recibirás un enlace para restablecer tu contraseña')}`,
			);
		}

		// 3) Enviar email de recuperación de contraseña
		const redirectTo = `${url.origin}/auth/reset-password`;

		const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
			redirectTo,
		});

		if (resetError) {
			const msg = encodeURIComponent(
				`Error al enviar email de recuperación: ${resetError.message}`,
			);
			return redirect(`${back}?status=error&msg=${msg}`);
		}

		return redirect(
			`${back}?status=success&msg=${encodeURIComponent('Si el email está registrado, recibirás un enlace para restablecer tu contraseña')}`,
		);
	} catch (e: any) {
		const msg = encodeURIComponent(`Error inesperado: ${e?.message ?? e}`);
		return redirect(`${back}?status=error&msg=${msg}`);
	}
};