export const prerender = false;

import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '@infrastructure/supabase';
import { SECURITY_HEADERS, safeBack } from '@infrastructure/security/headers';
import { ACTIVE_COMPANY_COOKIE } from '@shared/cookies';

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;
const UUID_RE =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
	const supabase = createSupabaseServerClient({
		headers: request.headers,
		cookies,
	});

	const {
		data: { user },
		error: userErr,
	} = await supabase.auth.getUser();

	if (userErr || !user) {
		return new Response(JSON.stringify({ error: 'No autenticado' }), {
			status: 401,
			headers: SECURITY_HEADERS,
		});
	}

	const form = await request.formData();
	const companyId = form.get('company_id')?.toString().trim();
	const back = safeBack(form.get('back')?.toString(), '/');

	if (!companyId || !UUID_RE.test(companyId)) {
		return new Response(JSON.stringify({ error: 'company_id inválido' }), {
			status: 400,
			headers: SECURITY_HEADERS,
		});
	}

	// El id que envía el switcher puede ser el de una incorporación en proceso
	// o el de una empresa dada de alta como ya existente. Ambos son válidos
	// mientras pertenezcan al usuario.
	const [incResult, compResult] = await Promise.all([
		supabase
			.from('incorporations')
			.select('id')
			.eq('id', companyId)
			.eq('user_id', user.id)
			.maybeSingle(),
		supabase
			.from('companies')
			.select('id')
			.eq('id', companyId)
			.eq('user_id', user.id)
			.maybeSingle(),
	]);

	if (!incResult.data && !compResult.data) {
		return new Response(
			JSON.stringify({ error: 'Empresa no encontrada' }),
			{ status: 404, headers: SECURITY_HEADERS },
		);
	}

	cookies.set(ACTIVE_COMPANY_COOKIE, companyId, {
		path: '/',
		sameSite: 'lax',
		httpOnly: false,
		secure: import.meta.env.PROD,
		maxAge: ONE_YEAR_SECONDS,
	});

	const accept = request.headers.get('accept') ?? '';
	if (accept.includes('application/json')) {
		return new Response(JSON.stringify({ ok: true, company_id: companyId }), {
			status: 200,
			headers: SECURITY_HEADERS,
		});
	}

	return redirect(back);
};
