export const prerender = false;

import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '@infrastructure/supabase';
import { createLogger } from '@infrastructure/logging';

const log = createLogger('api:feedback');

const ALLOWED_CATEGORIES = ['bug', 'sugerencia', 'ux', 'general'] as const;
type Category = (typeof ALLOWED_CATEGORIES)[number];

export const POST: APIRoute = async ({ request, cookies }) => {
	const supabase = createSupabaseServerClient({
		headers: request.headers,
		cookies,
	});

	const {
		data: { user },
		error: userErr,
	} = await supabase.auth.getUser();

	if (userErr || !user) {
		return new Response(
			JSON.stringify({ ok: false, error: 'No autenticado' }),
			{ status: 401, headers: { 'Content-Type': 'application/json' } },
		);
	}

	let body: {
		category?: string;
		message?: string;
		rating?: number | string | null;
		page_url?: string;
	};
	try {
		body = await request.json();
	} catch {
		return new Response(
			JSON.stringify({ ok: false, error: 'JSON inválido' }),
			{ status: 400, headers: { 'Content-Type': 'application/json' } },
		);
	}

	const category = (body.category ?? '').trim() as Category;
	const message = (body.message ?? '').trim();
	const ratingRaw = body.rating;
	const rating =
		ratingRaw === null || ratingRaw === undefined || ratingRaw === ''
			? null
			: Number(ratingRaw);

	if (!ALLOWED_CATEGORIES.includes(category)) {
		return new Response(
			JSON.stringify({ ok: false, error: 'Categoría inválida' }),
			{ status: 400, headers: { 'Content-Type': 'application/json' } },
		);
	}
	if (!message || message.length > 4000) {
		return new Response(
			JSON.stringify({
				ok: false,
				error: 'El mensaje debe tener entre 1 y 4000 caracteres',
			}),
			{ status: 400, headers: { 'Content-Type': 'application/json' } },
		);
	}
	if (rating !== null && (!Number.isInteger(rating) || rating < 1 || rating > 5)) {
		return new Response(
			JSON.stringify({ ok: false, error: 'Rating inválido (1-5)' }),
			{ status: 400, headers: { 'Content-Type': 'application/json' } },
		);
	}

	const userAgent = request.headers.get('user-agent')?.slice(0, 500) ?? null;
	const pageUrl = (body.page_url ?? '').toString().slice(0, 500) || null;

	const { error } = await supabase.from('beta_feedback').insert({
		user_id: user.id,
		category,
		message,
		rating,
		page_url: pageUrl,
		user_agent: userAgent,
	});

	if (error) {
		log.error('insert failed', { err: error, userId: user.id });
		return new Response(
			JSON.stringify({ ok: false, error: 'No se pudo guardar el feedback' }),
			{ status: 500, headers: { 'Content-Type': 'application/json' } },
		);
	}

	return new Response(JSON.stringify({ ok: true }), {
		status: 201,
		headers: { 'Content-Type': 'application/json' },
	});
};
