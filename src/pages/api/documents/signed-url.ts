export const prerender = false;

import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '@lib/supabase';
import { supabaseAdmin } from '@lib/supabase/admin';

const STAFF_ROLES = new Set(['admin', 'operaciones']);

function getDocumentsBucket(): string {
	return (
		process.env.SUPABASE_DOCUMENTS_BUCKET ??
		import.meta.env.SUPABASE_DOCUMENTS_BUCKET ??
		'documents'
	);
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

		const userId = userData.user.id;
		const userRoles = locals.userRoles || [];
		const isStaff = (userRoles as string[]).some((role) => STAFF_ROLES.has(role));
		const body = await request.json().catch(() => null);
		const documentId = body?.documentId as string | undefined;

		if (!documentId) {
			return new Response(JSON.stringify({ error: 'Falta documentId' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		const { data: doc, error: docErr } = await supabaseAdmin
			.from('documents')
			.select('id, storage_path, deleted_at, visibility, case_id')
			.eq('id', documentId)
			.maybeSingle();

		if (docErr) {
			console.error('[documents/signed-url] Document fetch error:', docErr);
			return new Response(JSON.stringify({ error: 'Error consultando documento' }), {
				status: 500,
				headers: { 'Content-Type': 'application/json' },
			});
		}
		if (!doc || doc.deleted_at) {
			return new Response(JSON.stringify({ error: 'Documento no encontrado' }), {
				status: 404,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		const { data: link, error: linkErr } = await supabaseAdmin
			.from('document_links')
			.select('related_to_id')
			.eq('document_id', documentId)
			.eq('related_to_type', 'incorporation_case')
			.maybeSingle();

		if (linkErr) {
			console.error('[documents/signed-url] Link fetch error:', linkErr);
			return new Response(JSON.stringify({ error: 'Error verificando acceso' }), {
				status: 500,
				headers: { 'Content-Type': 'application/json' },
			});
		}
		if (!link?.related_to_id) {
			return new Response(JSON.stringify({ error: 'No autorizado' }), {
				status: 403,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		const caseId = (doc.case_id as string | null) ?? (link.related_to_id as string);

		const { data: ownedCase, error: ownErr } = await supabaseAdmin
			.from('empresas_incorporaciones')
			.select('empresa_incorporacion_id')
			.eq('empresa_incorporacion_id', caseId)
			.eq('user_id', userId)
			.maybeSingle();

		if (ownErr) {
			console.error('[documents/signed-url] Ownership check error:', ownErr);
			return new Response(JSON.stringify({ error: 'Error verificando acceso' }), {
				status: 500,
				headers: { 'Content-Type': 'application/json' },
			});
		}
		if (!isStaff) {
			if (!ownedCase) {
				return new Response(JSON.stringify({ error: 'No autorizado' }), {
					status: 403,
					headers: { 'Content-Type': 'application/json' },
				});
			}

			if (doc.visibility !== 'client_visible') {
				return new Response(JSON.stringify({ error: 'No autorizado' }), {
					status: 403,
					headers: { 'Content-Type': 'application/json' },
				});
			}

			const { data: share, error: shareErr } = await supabaseAdmin
				.from('document_shares')
				.select('id')
				.eq('document_id', documentId)
				.eq('shared_with_user_id', userId)
				.eq('share_status', 'active')
				.maybeSingle();

			if (shareErr) {
				console.error('[documents/signed-url] Share check error:', shareErr);
				return new Response(JSON.stringify({ error: 'Error verificando acceso' }), {
					status: 500,
					headers: { 'Content-Type': 'application/json' },
				});
			}
			if (!share) {
				return new Response(JSON.stringify({ error: 'No autorizado' }), {
					status: 403,
					headers: { 'Content-Type': 'application/json' },
				});
			}
		}

		const bucket = getDocumentsBucket();
		const { data, error } = await supabaseAdmin.storage
			.from(bucket)
			.createSignedUrl(doc.storage_path, 3600);

		if (error) {
			console.error('[documents/signed-url] Signed URL error:', error);
			return new Response(JSON.stringify({ error: 'Error generando enlace' }), {
				status: 500,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		await supabaseAdmin.from('document_events').insert({
			document_id: documentId,
			case_id: caseId,
			event_type: 'downloaded',
			actor_user_id: userId,
			actor_role: isStaff ? (userRoles.includes('admin') ? 'admin' : 'operaciones') : 'cliente',
			metadata: {
				signed_url_ttl_seconds: 3600,
			},
		});

		return new Response(JSON.stringify({ signedUrl: data.signedUrl }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (e: unknown) {
		console.error('[documents/signed-url] Unexpected error:', e);
		return new Response(JSON.stringify({ error: 'Error inesperado' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
};
