export const prerender = false;

import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '@lib/supabase';
import { supabaseAdmin } from '@lib/supabase/admin';

const STAFF_ROLES = new Set(['admin', 'operaciones']);

function hasStaffAccess(userRoles: string[]) {
	return userRoles.some((role) => STAFF_ROLES.has(role));
}

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
		const isStaff = hasStaffAccess(userRoles);
		const incorporationCaseId =
			url.searchParams.get('incorporationCaseId')?.trim() || '';

		if (!incorporationCaseId) {
			return new Response(
				JSON.stringify({ error: 'Falta incorporationCaseId' }),
				{
					status: 400,
					headers: { 'Content-Type': 'application/json' },
				},
			);
		}

		const { data: caseRow, error: caseErr } = await supabaseAdmin
			.from('empresas_incorporaciones')
			.select('empresa_incorporacion_id, user_id')
			.eq('empresa_incorporacion_id', incorporationCaseId)
			.maybeSingle();

		if (caseErr) {
			return new Response(
				JSON.stringify({ error: 'Error consultando el caso' }),
				{
					status: 500,
					headers: { 'Content-Type': 'application/json' },
				},
			);
		}

		if (!caseRow) {
			return new Response(JSON.stringify({ error: 'Caso no encontrado' }), {
				status: 404,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		if (!isStaff && caseRow.user_id !== userId) {
			return new Response(JSON.stringify({ error: 'No autorizado' }), {
				status: 403,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		const { data: links, error: linksErr } = await supabaseAdmin
			.from('document_links')
			.select(
				`
				document_id,
				documents:document_id (
					id,
					case_id,
					file_name,
					file_title,
					file_path,
					file_size_bytes,
					mime_type,
					status,
					visibility,
					uploaded_at,
					created_at,
					document_request_id,
					document_types:document_type_id (
						id,
						code,
						name,
						legal_category,
						applies_to
					)
				)
			`,
			)
			.eq('related_to_type', 'incorporation_case')
			.eq('related_to_id', incorporationCaseId)
			.order('created_at', { ascending: false });

		if (linksErr) {
			return new Response(
				JSON.stringify({ error: 'Error listando documentos' }),
				{
					status: 500,
					headers: { 'Content-Type': 'application/json' },
				},
			);
		}

		const docs = ((links ?? [])
			.map((item: any) => item?.documents)
			.filter(Boolean) as any[]).map((doc) => ({
			...doc,
			case_id: doc.case_id ?? incorporationCaseId,
		}));

		const documentIds = docs.map((doc) => doc.id);

		let sharesByDocument = new Map<string, any[]>();
		if (documentIds.length > 0) {
			const { data: shares, error: sharesErr } = await supabaseAdmin
				.from('document_shares')
				.select(
					'id, document_id, shared_with_user_id, shared_by_user_id, shared_at, share_status',
				)
				.in('document_id', documentIds);

			if (sharesErr) {
				return new Response(
					JSON.stringify({ error: 'Error listando comparticiones' }),
					{
						status: 500,
						headers: { 'Content-Type': 'application/json' },
					},
				);
			}

			for (const share of shares ?? []) {
				const prev = sharesByDocument.get(share.document_id) ?? [];
				prev.push(share);
				sharesByDocument.set(share.document_id, prev);
			}
		}

		const output = docs
			.map((doc) => {
				const shares = sharesByDocument.get(doc.id) ?? [];
				const activeShares = shares.filter((share) => share.share_status === 'active');
				const isVisibleForClient =
					doc.visibility === 'client_visible' &&
					activeShares.some((share) => share.shared_with_user_id === userId);

				return {
					...doc,
					shares,
					active_share_count: activeShares.length,
					is_shared_with_case_owner: activeShares.some(
						(share) => share.shared_with_user_id === caseRow.user_id,
					),
					is_visible_for_client: isVisibleForClient,
				};
			})
			.filter((doc) => {
				if (isStaff) return true;
				return doc.is_visible_for_client;
			});

		return new Response(
			JSON.stringify({
				case_id: incorporationCaseId,
				role: isStaff ? 'staff' : 'client',
				documents: output,
			}),
			{
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			},
		);
	} catch (error) {
		console.error('[documents/list] Unexpected error:', error);
		return new Response(JSON.stringify({ error: 'Error inesperado' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
};

