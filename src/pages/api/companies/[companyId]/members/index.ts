import type { APIRoute } from 'astro';
import { json, requireCompanyDataManager } from '@shared/api/company-data';
import {
	createCompanyMember,
	createCompanyMemberWithNewPerson,
	type CompanyMemberInput,
} from '@domains/companies/company-members';
import type { MemberInput } from '@domains/members/people';
import { memberSchema } from '@modules/companies/islands/company-details/schemas/member.schema';
import { BusinessRuleError } from '@domains/companies/rules/errors';

import { createLogger } from '@infrastructure/logging';

export const prerender = false;

const log = createLogger('companies.members');

const UUID_RE =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const parseCompanyId = (raw: string | undefined) => {
	const trimmed = raw?.trim();
	if (!trimmed) return null;
	return UUID_RE.test(trimmed) ? trimmed : null;
};

/**
 * Body válidos:
 *  - `{ member_id, percentage, start_date, is_member, is_manager }` (vincular persona existente).
 *  - `{ new_person: MemberInput, percentage, start_date, is_member, is_manager }` (crear persona + vincular atómicamente).
 *
 * Rechaza si llegan ambos o ninguno.
 */
type AttachExistingBody = CompanyMemberInput & { new_person?: never };
type CreateAndAttachBody = Omit<CompanyMemberInput, 'member_id'> & {
	member_id?: never;
	new_person: MemberInput;
};
type CreateMemberBody = AttachExistingBody | CreateAndAttachBody;

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

export const POST: APIRoute = async ({ request, cookies, params }) => {
	const companyId = parseCompanyId(params.companyId);
	if (!companyId) {
		return json(400, { ok: false, error: 'INVALID_COMPANY_ID' });
	}

	const context = await requireCompanyDataManager(request, cookies);
	if ('error' in context) return context.error;

	const body = (await request
		.json()
		.catch(() => null)) as CreateMemberBody | null;
	if (!body || typeof body !== 'object') {
		return json(400, { ok: false, error: 'INVALID_BODY' });
	}

	const hasMemberId =
		typeof body.member_id === 'string' && body.member_id.trim().length > 0;
	const hasNewPerson = isPlainObject(body.new_person);

	if (hasMemberId && hasNewPerson) {
		return json(400, {
			ok: false,
			error: 'MEMBER_AND_NEW_PERSON_BOTH_PROVIDED',
		});
	}
	if (!hasMemberId && !hasNewPerson) {
		return json(400, { ok: false, error: 'MEMBER_OR_NEW_PERSON_REQUIRED' });
	}

	// La persona nueva se valida con el mismo schema que el formulario, que
	// además normaliza las cadenas vacías a `null` (los enums de la DB no las
	// admiten).
	const parsedPerson = hasNewPerson
		? memberSchema.safeParse(body.new_person)
		: null;
	if (parsedPerson && !parsedPerson.success) {
		return json(400, {
			ok: false,
			error: parsedPerson.error.issues[0]?.message ?? 'INVALID_NEW_PERSON',
		});
	}

	const relationInput: Omit<CompanyMemberInput, 'member_id'> = {
		...(body.percentage !== undefined ? { percentage: body.percentage } : {}),
		...(body.start_date !== undefined ? { start_date: body.start_date } : {}),
		...(body.is_member !== undefined ? { is_member: body.is_member } : {}),
		...(body.is_manager !== undefined ? { is_manager: body.is_manager } : {}),
	};

	try {
		const member = parsedPerson?.success
			? await createCompanyMemberWithNewPerson(
					context.supabase,
					companyId,
					parsedPerson.data as MemberInput,
					relationInput,
					context.user.id,
				)
			: await createCompanyMember(
					context.supabase,
					companyId,
					body as CompanyMemberInput,
					context.user.id,
				);
		return json(200, { ok: true, data: member });
	} catch (error) {
		log.error('create', { error });
		if (error instanceof BusinessRuleError) {
			return json(422, { ok: false, error: error.message, code: error.code });
		}
		return json(500, {
			ok: false,
			error: error instanceof Error ? error.message : 'INTERNAL_ERROR',
		});
	}
};
