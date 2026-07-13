import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '@infrastructure/supabase';
import { SECURITY_HEADERS } from '@infrastructure/security/headers';
import { extractTokenRoleNames, isAdmin } from '@shared/roles';
import { listTemplates, createTemplate } from '@domains/templates/templates';
import type { CreateTemplateInput } from '@domains/templates/types';

const json = (status: number, payload: unknown) =>
	new Response(JSON.stringify(payload), {
		status,
		headers: SECURITY_HEADERS,
	});

export const prerender = false;

export const GET: APIRoute = async ({ request, cookies }) => {
	const supabase = createSupabaseServerClient({ headers: request.headers, cookies });

	const { data: claims } = await supabase.auth.getClaims();
	if (!claims?.claims) return json(401, { error: 'NO_AUTH' });

	const roles = extractTokenRoleNames(claims.claims);
	const url = new URL(request.url);
	const params: {
		category?: string;
		type?: 'word' | 'pdf';
		relatedToType?: string;
		includeInactive?: boolean;
		includeDeleted?: boolean;
	} = {};

	const category = url.searchParams.get('category');
	if (category) params.category = category;

	const type = url.searchParams.get('type');
	if (type === 'word' || type === 'pdf') params.type = type;

	const relatedToType = url.searchParams.get('relatedToType');
	if (relatedToType) params.relatedToType = relatedToType;

	if (url.searchParams.get('includeInactive') === 'true') params.includeInactive = true;

	if (url.searchParams.get('includeDeleted') === 'true' && isAdmin(roles)) {
		params.includeDeleted = true;
	}

	try {
		const templates = await listTemplates(supabase, params);
		return json(200, { data: templates });
	} catch (err) {
		return json(500, { error: 'INTERNAL_ERROR' });
	}
};

export const POST: APIRoute = async ({ request, cookies }) => {
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

	if (!body.name || typeof body.name !== 'string') {
		return json(400, { error: 'NAME_REQUIRED' });
	}
	if (!body.template_type || !['word', 'pdf'].includes(body.template_type as string)) {
		return json(400, { error: 'INVALID_TEMPLATE_TYPE' });
	}

	const input = {
		name: body.name as string,
		template_type: body.template_type as 'word' | 'pdf',
		...(body.description != null && { description: String(body.description) }),
		...(body.category != null && { category: String(body.category) }),
		...(body.related_to_type != null && { related_to_type: String(body.related_to_type) as CreateTemplateInput['related_to_type'] }),
		...(body.field_mapping != null && { field_mapping: body.field_mapping }),
		...(body.transformer_id != null && { transformer_id: String(body.transformer_id) }),
		...(body.source_url != null && { source_url: String(body.source_url) }),
		...(body.field_definitions != null && { field_definitions: body.field_definitions }),
	} as CreateTemplateInput;

	try {
		const template = await createTemplate(supabase, input, claims.claims.sub as string);
		return json(201, { data: template });
	} catch {
		return json(500, { error: 'CREATE_FAILED' });
	}
};
