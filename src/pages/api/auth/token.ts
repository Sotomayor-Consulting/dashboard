import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ cookies }) => {
	// Si tus cookies se llaman distinto, ajusta aquí:
	const access = cookies.get('sb-access-token')?.value;
	const refresh = cookies.get('sb-refresh-token')?.value;

	if (!access || !refresh) {
		return new Response(JSON.stringify({ ok: false }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	// Para SurveyJS solo necesitas el access_token para Authorization: Bearer ...
	return new Response(JSON.stringify({ ok: true, access_token: access }), {
		status: 200,
		headers: { 'Content-Type': 'application/json' },
	});
};
