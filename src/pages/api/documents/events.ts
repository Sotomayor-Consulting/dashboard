export const prerender = false;

import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '@lib/supabase';
import { supabaseAdmin } from '@lib/supabase/admin';

const STAFF_ROLES = new Set(['admin', 'operaciones']);

export const GET: APIRoute = async ({ request, cookies, url, locals }) => {
	try {
		const supabase = createSupabaseServerClient({ headers: request.headers, cookies });
		const { data: userData, error: userErr } = await supabase.auth.getUser();
		if (userErr || !userData?.user) {
			return new Response(JSON.stringify({ error: 'No autenticado' }), {
				status: 401,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		const userId = userData.user.id;
		const userRoles = locals.userRoles || [];
		const isStaff = userRoles.some((role: string) => STAFF_ROLES.has(role));
		const documentId = url.searchParams.get('documentId')?.trim() || '';

		if (!documentId) {
			return new Response(JSON.stringify({ error: 'Falta documentId' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		if (!isStaff) {
			const { data: share, error: shareErr } = await supabaseAdmin
				.from('document_shares')
				.select('id')
				.eq('document_id', documentId)
				.eq('shared_with_user_id', userId)
				.eq('share_status', 'active')
				.maybeSingle();
			if (shareErr || !share) {
				return new Response(JSON.stringify({ error: 'No autorizado' }), {
					status: 403,
					headers: { 'Content-Type': 'application/json' },
				});
			}
		}

		const { data: events, error } = await supabaseAdmin
			.from('document_events')
			.select(
				'id, event_type, from_status, to_status, actor_user_id, actor_role, notes, metadata, created_at',
			)
			.eq('document_id', documentId)
			.order('created_at', { ascending: false })
			.limit(20);

		if (error) {
			return new Response(
				JSON.stringify({ error: 'No se pudo obtener el historial' }),
				{
					status: 500,
					headers: { 'Content-Type': 'application/json' },
				},
			);
		}

		return new Response(JSON.stringify({ events: events ?? [] }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (error) {
		console.error('[documents/events] Unexpected error:', error);
		return new Response(JSON.stringify({ error: 'Error inesperado' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
};

