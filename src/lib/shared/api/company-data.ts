import type { AstroCookies } from 'astro';
import { createSupabaseServerClient } from '@infrastructure/supabase';
import { SECURITY_HEADERS } from '@infrastructure/security/headers';
import { canManageCompanyData, extractTokenRoleNames } from '@shared/roles';

export const json = (status: number, payload: unknown) =>
	new Response(JSON.stringify(payload), {
		status,
		headers: SECURITY_HEADERS,
	});

/** Solo exige sesión válida (sin rol de gestión). Para lecturas de catálogos. */
export async function requireAuthenticated(
	request: Request,
	cookies: AstroCookies,
) {
	const supabase = createSupabaseServerClient({
		headers: request.headers,
		cookies,
	});

	const {
		data: { user },
		error: authError,
	} = await supabase.auth.getUser();

	if (authError || !user) {
		return { error: json(401, { ok: false, error: 'NO_AUTH_USER' }) };
	}

	return { supabase, user };
}

export async function requireCompanyDataManager(
	request: Request,
	cookies: AstroCookies,
) {
	const supabase = createSupabaseServerClient({
		headers: request.headers,
		cookies,
	});

	const {
		data: { user },
		error: authError,
	} = await supabase.auth.getUser();
	const { data: claimsData, error: claimsError } =
		await supabase.auth.getClaims();

	if (authError || claimsError || !user || !claimsData?.claims) {
		return { error: json(401, { ok: false, error: 'NO_AUTH_USER' }) };
	}

	if (!canManageCompanyData(extractTokenRoleNames(claimsData.claims))) {
		return { error: json(403, { ok: false, error: 'FORBIDDEN' }) };
	}

	return { supabase, user };
}
