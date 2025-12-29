export const prerender = false;

import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';

const BACK_PATH = '/start';

export const POST: APIRoute = async ({ request, cookies, redirect, url }) => {
	const back = url.searchParams.get('back') || BACK_PATH;

	try {
		// 1) Form data
		const form = await request.formData();
		const name = form.get('name')?.toString().trim();
		const lastName = form.get('last-name')?.toString().trim();
		const email = form.get('email')?.toString().trim();
		const password = form.get('password')?.toString().trim();

		// 2) Validaciones
		if (!name) {
			const msg = encodeURIComponent('El nombre es obligatorio');
			return redirect(`${back}?status=error&msg=${msg}`);
		}
		if (!lastName) {
			const msg = encodeURIComponent('El apellido es obligatorio');
			return redirect(`${back}?status=error&msg=${msg}`);
		}
		if (!email) {
			const msg = encodeURIComponent('El correo electrónico es obligatorio');
			return redirect(`${back}?status=error&msg=${msg}`);
		}
		if (!password) {
			const msg = encodeURIComponent('La contraseña es obligatoria');
			return redirect(`${back}?status=error&msg=${msg}`);
		}

		// 3) Registro en auth.users
		const { data, error } = await supabase.auth.signUp({
			email,
			password,
			options: {
				data: {
					name,
					lastName,
				},
			},
		});

		if (error) {
			const msg = encodeURIComponent(`Error: ${error.message}`);
			return redirect(`${back}?status=error&msg=${msg}`);
		}

		// 4) Configurar sesión si se retorna
		if (data.session) {
			cookies.set('sb-access-token', data.session.access_token, {
				path: '/',
				httpOnly: true,
				secure: true,
				sameSite: 'lax',
			});
			cookies.set('sb-refresh-token', data.session.refresh_token, {
				path: '/',
				httpOnly: true,
				secure: true,
				sameSite: 'lax',
			});
			return redirect('/');
		}

		// 5) OK
		return redirect(
			`${back}?status=success&msg=${encodeURIComponent('Revisa tu email para confirmar')}`,
		);
	} catch (e: any) {
		const msg = encodeURIComponent(`Error inesperado: ${e?.message ?? e}`);
		return redirect(`${back}?status=error&msg=${msg}`);
	}
};
