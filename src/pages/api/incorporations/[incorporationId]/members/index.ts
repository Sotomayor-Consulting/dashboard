import type { APIRoute } from 'astro';
import { json, requireCompanyDataManager } from '@shared/api/company-data';
import { getCompanyIdForIncorporation } from '@domains/companies/company-records';
import {
	createCompanyMember,
	createCompanyMemberWithNewPerson,
	type CompanyMemberInput,
} from '@domains/companies/company-members';
import type { MemberInput } from '@domains/members/people';
import { BusinessRuleError } from '@domains/companies/rules/errors';

export const prerender = false;

type AttachExistingBody = CompanyMemberInput & { new_person?: never };
type CreateAndAttachBody = Omit<CompanyMemberInput, 'member_id'> & {
	member_id?: never;
	new_person: MemberInput;
};
type CreateMemberBody = AttachExistingBody | CreateAndAttachBody;

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Endpoint legacy en el ámbito de incorporación. Resuelve `companyId` desde
 * `empresas_incorporaciones.company_id` y delega en las domain functions
 * company-scoped. Acepta el mismo payload combinado que
 * `/api/companies/[companyId]/members`.
 */
export const POST: APIRoute = async ({ request, cookies, params }) => {
	const incorporationId = params.incorporationId?.trim();
	if (!incorporationId) {
		return json(400, { ok: false, error: 'MISSING_INCORPORATION_ID' });
	}

	const context = await requireCompanyDataManager(request, cookies);
	if ('error' in context) return context.error;

	const body = (await request.json().catch(() => null)) as
		| CreateMemberBody
		| null;
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

	const relationInput: Omit<CompanyMemberInput, 'member_id'> = {
		...(body.percentage !== undefined ? { percentage: body.percentage } : {}),
		...(body.start_date !== undefined ? { start_date: body.start_date } : {}),
		...(body.is_member !== undefined ? { is_member: body.is_member } : {}),
		...(body.is_manager !== undefined ? { is_manager: body.is_manager } : {}),
	};

	try {
		const companyId = await getCompanyIdForIncorporation(
			context.supabase,
			incorporationId,
		);
		if (!companyId) {
			return json(409, { ok: false, error: 'COMPANY_NOT_CREATED' });
		}

		const member = hasNewPerson
			? await createCompanyMemberWithNewPerson(
					context.supabase,
					companyId,
					body.new_person as MemberInput,
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
		console.error('[company_members:create]', error);
		if (error instanceof BusinessRuleError) {
			return json(422, { ok: false, error: error.message, code: error.code });
		}
		return json(500, {
			ok: false,
			error: error instanceof Error ? error.message : 'INTERNAL_ERROR',
		});
	}
};
