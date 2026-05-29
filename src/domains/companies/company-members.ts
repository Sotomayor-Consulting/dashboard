import type { SupabaseClient } from '@supabase/supabase-js';
import { recordAuditEvent } from '@domains/audit/audit-events';
import {
	createMember,
	MEMBER_COLUMNS,
	type MemberInput,
	type MemberRow,
} from '@domains/members/people';
import {
	assertManagerInvariantOnRemoval,
	assertMemberRoleAllowed,
} from './rules/management-type.rules';

export interface CompanyMemberInput {
	member_id: string;
	percentage?: number | null;
	start_date?: string | null;
	is_member?: boolean;
	is_manager?: boolean;
}

export interface CompanyMemberRow {
	id: number;
	company_id: string;
	member_id: string;
	percentage: number | null;
	start_date: string | null;
	end_date: string | null;
	is_member: boolean;
	is_manager: boolean;
	is_active: boolean | null;
	created_at: string;
	created_by: string | null;
	updated_at: string | null;
	updated_by: string | null;
	deleted_at: string | null;
	deleted_by: string | null;
	delete_reason: string | null;
	member?: MemberRow | null;
}

const RELATION_COLUMNS =
	'id, company_id, member_id, percentage, start_date, end_date, is_member, is_manager, is_active, created_at, created_by, updated_at, updated_by, deleted_at, deleted_by, delete_reason';

const SELECT_WITH_MEMBER = `${RELATION_COLUMNS}, member:members ( ${MEMBER_COLUMNS} )`;

const cleanText = (value: unknown) => {
	if (typeof value !== 'string') return null;
	const trimmed = value.trim();
	return trimmed ? trimmed : null;
};

const cleanNumber = (value: unknown) => {
	if (typeof value === 'number' && Number.isFinite(value)) return value;
	if (typeof value !== 'string' || value.trim() === '') return null;
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : null;
};

const cleanUuid = (value: unknown) => {
	const text = cleanText(value);
	if (!text) return null;
	return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
		text,
	)
		? text
		: null;
};

const cleanDate = (value: unknown) => {
	const text = cleanText(value);
	if (!text) return null;
	const parsed = new Date(text);
	return Number.isNaN(parsed.getTime()) ? null : text;
};

const relationPayload = (input: CompanyMemberInput) => {
	const percentage = cleanNumber(input.percentage);
	if (percentage !== null && (percentage < 0 || percentage > 100)) {
		throw new Error('PERCENTAGE_OUT_OF_RANGE');
	}

	const isMember = input.is_member ?? false;
	const isManager = input.is_manager ?? false;
	if (!isMember && !isManager) {
		throw new Error('ROLE_REQUIRED');
	}

	return {
		percentage,
		start_date: cleanDate(input.start_date),
		is_member: isMember,
		is_manager: isManager,
		is_active: true,
	};
};

export async function listCompanyMembers(
	supabase: SupabaseClient,
	companyId: string,
): Promise<CompanyMemberRow[]> {
	const { data, error } = await supabase
		.from('company_members')
		.select(SELECT_WITH_MEMBER)
		.eq('company_id', companyId)
		.is('deleted_at', null)
		.order('created_at', { ascending: true });

	if (error) throw error;
	return (data ?? []) as unknown as CompanyMemberRow[];
}

async function findActiveRelation(
	supabase: SupabaseClient,
	companyId: string,
	memberId: string,
): Promise<{ id: number } | null> {
	const { data, error } = await supabase
		.from('company_members')
		.select('id')
		.eq('company_id', companyId)
		.eq('member_id', memberId)
		.is('deleted_at', null)
		.maybeSingle<{ id: number }>();

	if (error) throw error;
	return data ?? null;
}

async function getCompanyMember(
	supabase: SupabaseClient,
	companyId: string,
	memberId: number,
): Promise<CompanyMemberRow | null> {
	const { data, error } = await supabase
		.from('company_members')
		.select(SELECT_WITH_MEMBER)
		.eq('id', memberId)
		.eq('company_id', companyId)
		.is('deleted_at', null)
		.maybeSingle();

	if (error) throw error;
	return (data as unknown as CompanyMemberRow) ?? null;
}

export async function createCompanyMember(
	supabase: SupabaseClient,
	companyId: string,
	input: CompanyMemberInput,
	actorUserId: string,
): Promise<CompanyMemberRow> {
	const memberId = cleanUuid(input.member_id);
	if (!memberId) throw new Error('MEMBER_ID_REQUIRED');

	const duplicate = await findActiveRelation(supabase, companyId, memberId);
	if (duplicate) throw new Error('COMPANY_MEMBER_DUPLICATE');

	const payload = relationPayload(input);
	await assertMemberRoleAllowed(supabase, companyId, {
		is_manager: payload.is_manager,
	});
	const now = new Date().toISOString();

	const { data: inserted, error } = await supabase
		.from('company_members')
		.insert({
			...payload,
			company_id: companyId,
			member_id: memberId,
			created_at: now,
			created_by: actorUserId,
			updated_at: now,
			updated_by: actorUserId,
		})
		.select('id')
		.single<{ id: number }>();

	if (error) throw error;

	const row = await getCompanyMember(supabase, companyId, inserted.id);
	if (!row) throw new Error('COMPANY_MEMBER_NOT_FOUND');

	await recordAuditEvent({
		entityType: 'company_member',
		entityId: String(row.id),
		parentType: 'company',
		parentId: companyId,
		action: 'create',
		changedBy: actorUserId,
		afterData: row,
	});

	return row;
}

export async function updateCompanyMember(
	supabase: SupabaseClient,
	companyId: string,
	companyMemberId: number,
	input: CompanyMemberInput,
	actorUserId: string,
): Promise<CompanyMemberRow> {
	const before = await getCompanyMember(supabase, companyId, companyMemberId);
	if (!before) throw new Error('COMPANY_MEMBER_NOT_FOUND');

	const payload = relationPayload(input);

	// Regla: si se promueve a manager en empresa member-managed → bloqueado
	if (payload.is_manager && !before.is_manager) {
		await assertMemberRoleAllowed(supabase, companyId, {
			is_manager: true,
		});
	}
	// Regla: si se despromueve un manager en empresa manager-managed → exigir que quede ≥1
	if (!payload.is_manager && before.is_manager) {
		await assertManagerInvariantOnRemoval(supabase, companyId, companyMemberId);
	}

	const { error } = await supabase
		.from('company_members')
		.update({
			...payload,
			updated_at: new Date().toISOString(),
			updated_by: actorUserId,
		})
		.eq('id', companyMemberId)
		.eq('company_id', companyId)
		.is('deleted_at', null);

	if (error) throw error;

	const after = await getCompanyMember(supabase, companyId, companyMemberId);
	if (!after) throw new Error('COMPANY_MEMBER_NOT_FOUND');

	await recordAuditEvent({
		entityType: 'company_member',
		entityId: String(after.id),
		parentType: 'company',
		parentId: companyId,
		action: 'update',
		changedBy: actorUserId,
		beforeData: before,
		afterData: after,
	});

	return after;
}

export async function softDeleteCompanyMember(
	supabase: SupabaseClient,
	companyId: string,
	companyMemberId: number,
	actorUserId: string,
	reason: string | null,
): Promise<CompanyMemberRow> {
	const before = await getCompanyMember(supabase, companyId, companyMemberId);
	if (!before) throw new Error('COMPANY_MEMBER_NOT_FOUND');

	// Regla: si era manager y la empresa es manager-managed, exigir que quede ≥1 manager
	if (before.is_manager) {
		await assertManagerInvariantOnRemoval(supabase, companyId, companyMemberId);
	}

	const deletedAt = new Date().toISOString();
	const { error } = await supabase
		.from('company_members')
		.update({
			deleted_at: deletedAt,
			deleted_by: actorUserId,
			delete_reason: cleanText(reason),
			is_active: false,
			updated_at: deletedAt,
			updated_by: actorUserId,
		})
		.eq('id', companyMemberId)
		.eq('company_id', companyId)
		.is('deleted_at', null);

	if (error) throw error;

	const after = { ...before, deleted_at: deletedAt, is_active: false };

	await recordAuditEvent({
		entityType: 'company_member',
		entityId: String(before.id),
		parentType: 'company',
		parentId: companyId,
		action: 'soft_delete',
		changedBy: actorUserId,
		beforeData: before,
		afterData: after,
	});

	return after;
}

/**
 * Crea una persona nueva (`members`) y la vincula como miembro/manager de la
 * empresa (`company_members`) en una sola operación. Si la creación de la
 * relación falla, se elimina el `members` recién creado (rollback manual) para
 * evitar dejar registros huérfanos — el modelo del producto exige que toda
 * persona esté asociada a al menos una empresa.
 *
 * El registro de auditoría del `member.create` queda en `audit_events` aunque
 * el rollback borre la fila — sirve como evidencia forense del intento.
 */
export async function createCompanyMemberWithNewPerson(
	supabase: SupabaseClient,
	companyId: string,
	personInput: MemberInput,
	relationInput: Omit<CompanyMemberInput, 'member_id'>,
	actorUserId: string,
): Promise<CompanyMemberRow> {
	const person = await createMember(supabase, personInput, actorUserId);

	try {
		return await createCompanyMember(
			supabase,
			companyId,
			{ ...relationInput, member_id: person.id },
			actorUserId,
		);
	} catch (relationError) {
		// Rollback manual: la persona se creó pero la relación falló, así que
		// quitamos la persona para no dejarla huérfana.
		try {
			const { error: deleteError } = await supabase
				.from('members')
				.delete()
				.eq('id', person.id);
			if (deleteError) {
				console.error(
					'[createCompanyMemberWithNewPerson] rollback delete failed for member',
					person.id,
					deleteError,
				);
			}
		} catch (rollbackError) {
			console.error(
				'[createCompanyMemberWithNewPerson] rollback threw for member',
				person.id,
				rollbackError,
			);
		}
		throw relationError;
	}
}
