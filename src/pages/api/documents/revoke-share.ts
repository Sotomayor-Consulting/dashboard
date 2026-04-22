export const prerender = false;

import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '@lib/supabase';
import { supabaseAdmin } from '@lib/supabase/admin';

const STAFF_ROLES = new Set(['admin', 'operaciones']);

function isStaffRole(userRoles: string[]) {
	return userRoles.some((role) => STAFF_ROLES.has(role));
}

export const POST: APIRoute = async ({ request, cookies, locals }) => {
	try {
		const supabase = createSupabaseServerClient({ headers: request.headers, cookies });
		const { data: userData, error: userErr } = await supabase.auth.getUser();
		if (userErr || !userData?.user) {
			return new Response(JSON.stringify({ error: 'No autenticado' }), {
				status: 401,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		const actor = userData.user;
		const userRoles = locals.userRoles || [];
		if (!isStaffRole(userRoles)) {
			return new Response(JSON.stringify({ error: 'No autorizado' }), {
				status: 403,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		const body = await request.json().catch(() => null);
		const documentId = body?.documentId as string | undefined;
		const sharedWithUserId = body?.sharedWithUserId as string | undefined;

		if (!documentId) {
			return new Response(JSON.stringify({ error: 'Falta documentId' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		const { data: link, error: linkErr } = await supabaseAdmin
			.from('document_links')
			.select('related_to_id')
			.eq('document_id', documentId)
			.eq('related_to_type', 'incorporation_case')
			.maybeSingle();

		if (linkErr || !link?.related_to_id) {
			return new Response(
				JSON.stringify({ error: 'No se encontró el caso para el documento' }),
				{
					status: 404,
					headers: { 'Content-Type': 'application/json' },
				},
			);
		}

		const caseId = link.related_to_id as string;
		const now = new Date().toISOString();

		let updateQuery = supabaseAdmin
			.from('document_shares')
			.update({
				share_status: 'revoked',
				updated_at: now,
			})
			.eq('document_id', documentId)
			.eq('share_status', 'active');

		if (sharedWithUserId) {
			updateQuery = updateQuery.eq('shared_with_user_id', sharedWithUserId);
		}

		const { data: revokedRows, error: revokeErr } = await updateQuery.select(
			'id, shared_with_user_id',
		);

		if (revokeErr) {
			return new Response(
				JSON.stringify({ error: 'No se pudo revocar la compartición' }),
				{
					status: 500,
					headers: { 'Content-Type': 'application/json' },
				},
			);
		}

		await supabaseAdmin.from('document_events').insert({
			document_id: documentId,
			case_id: caseId,
			event_type: 'share_revoked',
			actor_user_id: actor.id,
			actor_role: userRoles.includes('admin') ? 'admin' : 'operaciones',
			from_status: 'shared_active',
			to_status: 'shared_revoked',
			metadata: {
				shared_with_user_id: sharedWithUserId ?? null,
				revoked_count: revokedRows?.length ?? 0,
			},
		});

		if (revokedRows && revokedRows.length > 0) {
			const notificationsPayload = revokedRows.map((row) => ({
				user_id: row.shared_with_user_id,
				message: 'Se revocó el acceso a uno de tus documentos compartidos.',
				link: `/documentos/${caseId}`,
				mensaje_link: 'Ver documentos',
				created_at: now,
			}));
			await supabaseAdmin.from('notifications').insert(notificationsPayload);
		}

		return new Response(
			JSON.stringify({
				ok: true,
				documentId,
				caseId,
				revokedCount: revokedRows?.length ?? 0,
			}),
			{
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			},
		);
	} catch (error) {
		console.error('[documents/revoke-share] Unexpected error:', error);
		return new Response(JSON.stringify({ error: 'Error inesperado' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
};

