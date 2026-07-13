import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '@infrastructure/supabase';
import { SECURITY_HEADERS } from '@infrastructure/security/headers';
import { extractTokenRoleNames, isAdmin } from '@shared/roles';
import { getTemplateById, getTemplateFileContent } from '@domains/templates/templates';
import { detectPdfFormFields } from '@domains/templates/fill-pdf';

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

	const roles = extractTokenRoleNames(claims.claims);
	if (!isAdmin(roles)) return json(403, { error: 'FORBIDDEN' });

	const template = await getTemplateById(supabase, templateId);
	if (!template) return json(404, { error: 'TEMPLATE_NOT_FOUND' });

	if (template.template_type !== 'pdf') {
		return json(400, { error: 'NOT_A_PDF_TEMPLATE' });
	}
	if (!template.document && !template.source_url) {
		return json(400, { error: 'NO_FILE_UPLOADED' });
	}

	try {
		const fileContent = await getTemplateFileContent(template);
		const fields = await detectPdfFormFields(fileContent.content);
		return json(200, { data: fields });
	} catch (err) {
		const detail = err instanceof Error ? err.message : 'unknown error';
		return json(500, { error: 'DETECT_FAILED', detail });
	}
};
