import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '@infrastructure/supabase';
import { SECURITY_HEADERS } from '@infrastructure/security/headers';
import { ROLES, hasAnyRole } from '@shared/roles';
import { ensureCanonicalCompanyForIncorporation } from '@domains/companies/canonical-company';
import {
	createCompanyMember,
	type CompanyMemberInput,
} from '@domains/companies/company-members';

export const prerender = false;

const json = (status: number, payload: unknown) =>
	new Response(JSON.stringify(payload), {
		status,
		headers: SECURITY_HEADERS,
	});

const canEdit = (roles: string[]) =>
	hasAnyRole(roles, [ROLES.ADMIN, ROLES.GERENCIA, ROLES.OPERACIONES]);

export const POST: APIRoute = async ({ request, cookies, locals, params }) => {
	const incorporationId = params.incorporationId?.trim();
	if (!incorporationId) {
		return json(400, { ok: false, error: 'MISSING_INCORPORATION_ID' });
	}

	const supabase = createSupabaseServerClient({
		headers: request.headers,
		cookies,
	});

	const {
		data: { user },
		error: authError,
	} = await supabase.auth.getUser();

	if (authError || !user) {
		return json(401, { ok: false, error: 'NO_AUTH_USER' });
	}

	if (!canEdit((locals.userRoles || []) as string[])) {
		return json(403, { ok: false, error: 'FORBIDDEN' });
	}

	const body = (await request.json().catch(() => null)) as
		| CompanyMemberInput
		| null;
	if (!body) {
		return json(400, { ok: false, error: 'INVALID_BODY' });
	}

	try {
		const companyId = await ensureCanonicalCompanyForIncorporation(
			supabase,
			incorporationId,
			user.id,
		);
		const member = await createCompanyMember(supabase, companyId, body, user.id);

		return json(200, { ok: true, data: member });
	} catch (error) {
		console.error('[company_members:create]', error);
		return json(500, {
			ok: false,
			error: error instanceof Error ? error.message : 'INTERNAL_ERROR',
		});
	}
};
