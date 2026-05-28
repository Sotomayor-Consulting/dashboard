import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '@infrastructure/supabase';
import { SECURITY_HEADERS } from '@infrastructure/security/headers';
import { extractTokenRoleNames, isAdmin } from '@shared/roles';
import { uploadTemplateFile, updateTemplate, getTemplateById } from '@domains/templates/templates';
import { detectPdfFormFields } from '@domains/templates/fill-pdf';

const json = (status: number, payload: unknown) =>
	new Response(JSON.stringify(payload), {
		status,
		headers: SECURITY_HEADERS,
	});

export const prerender = false;

export const POST: APIRoute = async ({ params, request, cookies }) => {
	const { templateId } = params;
	if (!templateId) return json(400, { error: 'MISSING_ID' });

	const supabase = createSupabaseServerClient({ headers: request.headers, cookies });

	const { data: claims } = await supabase.auth.getClaims();
	if (!claims?.claims) return json(401, { error: 'NO_AUTH' });

	const roles = extractTokenRoleNames(claims.claims);
	if (!isAdmin(roles)) return json(403, { error: 'FORBIDDEN' });

	let formData: FormData;
	try {
		formData = await request.formData();
	} catch {
		return json(400, { error: 'INVALID_FORM_DATA' });
	}

	const file = formData.get('file');
	if (!file || !(file instanceof File)) {
		return json(400, { error: 'FILE_REQUIRED' });
	}

	if (file.size === 0) {
		return json(400, { error: 'FILE_EMPTY' });
	}

	let arrayBuf: ArrayBuffer;
	try {
		arrayBuf = await file.arrayBuffer();
	} catch (err) {
		const detail = err instanceof Error ? err.message : 'unknown error';
		return json(400, { error: 'FILE_READ_FAILED', detail });
	}

	try {
		const { documentId } = await uploadTemplateFile(
			templateId,
			new Blob([arrayBuf], { type: file.type }),
			claims.claims.sub as string,
			file.name,
		);

		const initial = await getTemplateById(supabase, templateId);
		if (initial && initial.template_type === 'pdf') {
			try {
				const fields = await detectPdfFormFields(arrayBuf);
				if (fields.length > 0) {
					await updateTemplate(supabase, templateId, { field_definitions: fields }, claims.claims.sub as string);
				}
			} catch (detectErr) {
				console.error('[templates/upload] detectPdfFormFields failed:', detectErr);
			}
		}

		const template = await getTemplateById(supabase, templateId);
		return json(200, { documentId, data: template });
	} catch (err) {
		console.error('[templates/upload] failed:', err);
		const detail = err instanceof Error ? err.message : 'unknown error';
		return json(500, { error: 'UPLOAD_FAILED', detail });
	}
};
