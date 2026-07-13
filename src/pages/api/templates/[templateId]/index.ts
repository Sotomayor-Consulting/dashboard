import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '@infrastructure/supabase';
import { SECURITY_HEADERS } from '@infrastructure/security/headers';
import { extractTokenRoleNames, isAdmin } from '@shared/roles';
import {
	getTemplateById,
	updateTemplate,
	softDeleteTemplate,
	hardDeleteTemplate,
} from '@domains/templates/templates';

const json = (status: number, payload: unknown) =>
	new Response(JSON.stringify(payload), {
		status,
		headers: SECURITY_HEADERS,
	});

export const prerender = false;

export const GET: APIRoute = async ({ params, request, cookies }) => {
	const { templateId } = params;
	if (!templateId) return json(400, { error: 'MISSING_ID' });

	const supabase = createSupabaseServerClient({ headers: request.headers, cookies });

	const { data: claims } = await supabase.auth.getClaims();
	if (!claims?.claims) return json(401, { error: 'NO_AUTH' });

	try {
		const template = await getTemplateById(supabase, templateId);
		if (!template) return json(404, { error: 'NOT_FOUND' });
		return json(200, { data: template });
	} catch {
		return json(500, { error: 'INTERNAL_ERROR' });
	}
};

export const PATCH: APIRoute = async ({ params, request, cookies }) => {
	const { templateId } = params;
	if (!templateId) return json(400, { error: 'MISSING_ID' });

	const supabase = createSupabaseServerClient({ headers: request.headers, cookies });

	const { data: claims } = await supabase.auth.getClaims();
	if (!claims?.claims) return json(401, { error: 'NO_AUTH' });

	const roles = extractTokenRoleNames(claims.claims);
	if (!isAdmin(roles)) return json(403, { error: 'FORBIDDEN' });

	let body: Record<string, unknown>;
	try {
		body = await request.json();
	} catch {
		return json(400, { error: 'INVALID_JSON' });
	}

	const allowedFields = [
		'name', 'description', 'category', 'template_type',
		'related_to_type', 'field_mapping', 'transformer_id',
		'source_url', 'field_definitions', 'is_active',
	];

	const updates: Record<string, unknown> = {};
	for (const key of allowedFields) {
		if (key in body) updates[key] = body[key];
	}

	try {
		const template = await updateTemplate(supabase, templateId, updates, claims.claims.sub as string);
		return json(200, { data: template });
	} catch {
		return json(500, { error: 'UPDATE_FAILED' });
	}
};

export const DELETE: APIRoute = async ({ params, request, cookies }) => {
	const { templateId } = params;
	if (!templateId) return json(400, { error: 'MISSING_ID' });

	const supabase = createSupabaseServerClient({ headers: request.headers, cookies });

	const { data: claims } = await supabase.auth.getClaims();
	if (!claims?.claims) return json(401, { error: 'NO_AUTH' });

	const roles = extractTokenRoleNames(claims.claims);
	if (!isAdmin(roles)) return json(403, { error: 'FORBIDDEN' });

	const url = new URL(request.url);
	const permanent = url.searchParams.get('permanent') === 'true';

	try {
		if (permanent) {
			await hardDeleteTemplate(templateId, claims.claims.sub as string);
		} else {
			await softDeleteTemplate(supabase, templateId, claims.claims.sub as string);
		}
		return json(200, { ok: true });
	} catch {
		return json(500, { error: permanent ? 'HARD_DELETE_FAILED' : 'SOFT_DELETE_FAILED' });
	}
};
