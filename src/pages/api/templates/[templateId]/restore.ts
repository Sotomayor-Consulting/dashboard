import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '@infrastructure/supabase';
import { SECURITY_HEADERS } from '@infrastructure/security/headers';
import { extractTokenRoleNames, isAdmin } from '@shared/roles';
import { restoreTemplate } from '@domains/templates/templates';

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

	try {
		const template = await restoreTemplate(supabase, templateId, claims.claims.sub as string);
		return json(200, { data: template });
	} catch {
		return json(500, { error: 'RESTORE_FAILED' });
	}
};
