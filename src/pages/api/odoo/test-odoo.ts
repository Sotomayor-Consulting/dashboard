import { apiClient } from '@integrations/odoo/axios-odoo-instance';
import type { APIRoute } from 'astro';
import { SECURITY_HEADERS } from '@infrastructure/security/headers';
import { createSupabaseServerClient } from '@infrastructure/supabase';

export const GET: APIRoute = async ({ request, cookies }) => {
	const supabase = createSupabaseServerClient({ headers: request.headers, cookies });
	const { data: { user }, error } = await supabase.auth.getUser();

	if (error || !user) {
		return new Response(JSON.stringify({ error: 'Unauthorized' }), {
			status: 401,
			headers: SECURITY_HEADERS,
		});
	}

	try {
		const response = await apiClient.post('/project.task/read', {
			ids: [7230, 7231, 7232, 7233, 7234, 7235, 7236, 7237, 7230, 7239],
			fields: [
				'display_name',
				'name',
				'create_date',
				'stage_id',
				'state',
				'priority',
				'user_ids',
			],
		});
		console.log('Conexión exitosa a Odoo');
		console.log('Data:', JSON.stringify(response.data, null, 2));
		return new Response(JSON.stringify(response.data, null, 2), {
			status: 200,
			headers: SECURITY_HEADERS,
		});
	} catch (error) {
		const message =
			error instanceof Error ? error.message : 'Unknown error';
		console.error('Error al conectar con Odoo:', message);

		return new Response(
			JSON.stringify({ error: 'Internal Server Error' }),
			{
				status: 500,
				headers: SECURITY_HEADERS,
			},
		);
	}
};
