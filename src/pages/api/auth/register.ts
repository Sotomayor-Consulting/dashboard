// src/pages/api/auth/register.ts
import type { APIRoute } from 'astro';
import { supabase } from '@lib/supabase';

function redirectWithMessage(
	redirectFn: any,
	msg: string,
	statusType: 'success' | 'error' = 'error',
	destination: string = '/sign-up',
) {
	const params = new URLSearchParams({ status: statusType, msg });
	return redirectFn(`${destination}?${params.toString()}`);
}

export const POST: APIRoute = async ({ request, redirect }) => {
	const formData = await request.formData();
	const email = formData.get('email')?.toString()?.trim();
	const password = formData.get('password')?.toString();
	const name = formData.get('name')?.toString()?.trim();
	const lastName = formData.get('last-name')?.toString()?.trim();

	// Validaciones
	if (!email || !password) {
		return redirectWithMessage(
			redirect,
			'Correo y contraseña son obligatorios.',
		);
	}

	if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
		return redirectWithMessage(redirect, 'Correo electrónico inválido.');
	}

	if (password.length < 6) {
		return redirectWithMessage(
			redirect,
			'La contraseña debe tener al menos 6 caracteres.',
		);
	}

	// Registro
	const { data, error } = await supabase.auth.signUp({
		email,
		password,
		options: {
			data: { name, lastName },
			emailRedirectTo: `${new URL(request.url).origin}/api/auth/callback`,
		},
	});

	if (error) {
		let msg = 'Error al registrar usuario.';
		if (error.message.includes('already registered')) {
			msg = 'Este correo ya está registrado.';
		} else if (error.message.includes('weak_password')) {
			msg = 'Contraseña muy débil.';
		}
		return redirectWithMessage(redirect, msg);
	}

	// Éxito
	if (data.user?.identities?.length === 0) {
		return redirectWithMessage(
			redirect,
			'Este correo ya está registrado.',
			'error',
			'/sign-in',
		);
	}

	return redirectWithMessage(
		redirect,
		'¡Registro exitoso! Por favor, inicia sesión.',
		'success',
		'/sign-in',
	);
};
