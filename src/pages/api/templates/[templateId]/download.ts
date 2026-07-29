import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '@infrastructure/supabase';
import { storage } from '@infrastructure/storage';
import { SECURITY_HEADERS } from '@infrastructure/security/headers';
import { extractTokenRoleNames, isAdmin } from '@shared/roles';
import { getTemplateById } from '@domains/templates/templates';

const json = (status: number, payload: unknown) =>
	new Response(JSON.stringify(payload), {
		status,
		headers: SECURITY_HEADERS,
	});

export const prerender = false;

/**
 * Devuelve una URL firmada (60 min) para descargar el archivo fuente de la
 * plantilla. Si la plantilla usa una `source_url` externa, la devuelve tal cual.
 */
export const GET: APIRoute = async ({ params, request, cookies }) => {
	const { templateId } = params;
	if (!templateId) return json(400, { error: 'MISSING_ID' });

	const supabase = createSupabaseServerClient({
		headers: request.headers,
		cookies,
	});

	const { data: claims } = await supabase.auth.getClaims();
	if (!claims?.claims) return json(401, { error: 'NO_AUTH' });

	const roles = extractTokenRoleNames(claims.claims);
	if (!isAdmin(roles)) return json(403, { error: 'FORBIDDEN' });

	const template = await getTemplateById(supabase, templateId);
	if (!template) return json(404, { error: 'TEMPLATE_NOT_FOUND' });

	if (template.source_url) {
		return json(200, {
			url: template.source_url,
			fileName: template.document?.file_name ?? null,
		});
	}

	if (!template.document) {
		return json(400, { error: 'NO_FILE' });
	}

	try {
		const url = await storage.createSignedUrl(
			template.document.bucket_storage,
			template.document.bucket_path,
			{ download: template.document.file_name },
		);
		return json(200, { url, fileName: template.document.file_name });
	} catch (error) {
		return json(500, {
			error: 'SIGNED_URL_FAILED',
			detail: error instanceof Error ? error.message : undefined,
		});
	}
};
