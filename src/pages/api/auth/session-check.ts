import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';

export const GET: APIRoute = async ({ request }) => {
	try {
		// Obtener cookies de la request
		const cookies = request.headers.get('cookie') || '';

		// Verificar si existen tokens de sesión en las cookies
		const hasAccessToken = cookies.includes('sb-access-token');
		const hasRefreshToken = cookies.includes('sb-refresh-token');

		// Si no hay tokens, retornar no autenticado inmediatamente
		if (!hasAccessToken && !hasRefreshToken) {
			return new Response(
				JSON.stringify({
					isAuthenticated: false,
				}),
				{
					status: 200,
					headers: {
						'Content-Type': 'application/json',
					},
				},
			);
		}

		// Intentar obtener la sesión actual
		const {
			data: { session },
			error: sessionError,
		} = await supabase.auth.getSession();

		if (sessionError || !session) {
			return new Response(
				JSON.stringify({
					isAuthenticated: false,
				}),
				{
					status: 200,
					headers: {
						'Content-Type': 'application/json',
					},
				},
			);
		}

		// Obtener información del usuario
		const {
			data: { user },
			error: userError,
		} = await supabase.auth.getUser();

		if (userError || !user) {
			return new Response(
				JSON.stringify({
					isAuthenticated: false,
				}),
				{
					status: 200,
					headers: {
						'Content-Type': 'application/json',
					},
				},
			);
		}

		// Usuario autenticado correctamente
		return new Response(
			JSON.stringify({
				isAuthenticated: true,
				user: {
					id: user.id,
					email: user.email,
					name: user.user_metadata?.name,
					lastName: user.user_metadata?.lastName,
				},
			}),
			{
				status: 200,
				headers: {
					'Content-Type': 'application/json',
				},
			},
		);
	} catch (error) {
		console.error('Error checking session:', error);

		return new Response(
			JSON.stringify({
				isAuthenticated: false,
				error: 'Error interno del servidor',
			}),
			{
				status: 200, // Mantenemos 200 para no romper el flujo del cliente
				headers: {
					'Content-Type': 'application/json',
				},
			},
		);
	}
};
