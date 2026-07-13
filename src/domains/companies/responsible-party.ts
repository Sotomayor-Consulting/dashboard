import type { SupabaseClient } from '@supabase/supabase-js';
import { recordAuditEvent } from '@domains/audit/audit-events';

export interface ResponsiblePartyRow {
	id: number;
	company_id: string;
	member_id: string;
	title: string | null;
	start_date: string;
	end_date: string | null;
	created_at: string;
	updated_at: string | null;
	/** Datos del member resuelto (lookup, no embed — la FK es compuesta hacia company_members). */
	member?: {
		id: string;
		full_name: string | null;
		person_type: string;
		email: string | null;
	} | null;
}

const cleanText = (value: unknown) => {
	if (typeof value !== 'string') return null;
	const trimmed = value.trim();
	return trimmed ? trimmed : null;
};

const today = () => new Date().toISOString().slice(0, 10);

async function resolveMembers(
	supabase: SupabaseClient,
	rows: ResponsiblePartyRow[],
): Promise<ResponsiblePartyRow[]> {
	const memberIds = [...new Set(rows.map((r) => r.member_id))];
	if (!memberIds.length) return rows;

	const { data: members, error } = await supabase
		.from('members')
		.select('id, first_name, last_name, name, person_type, user_id')
		.in('id', memberIds);
	if (error) throw error;

	const userIds = [
		...new Set((members ?? []).map((m) => m.user_id).filter(Boolean)),
	] as string[];
	const emails = new Map<string, string>();
	if (userIds.length) {
		const { data: users, error: usersError } = await supabase
			.from('usuarios')
			.select('user_id, correo')
			.in('user_id', userIds);
		if (usersError) throw usersError;
		for (const u of users ?? [])
			emails.set(u.user_id as string, u.correo as string);
	}

	const byId = new Map(
		(members ?? []).map((m) => [
			m.id as string,
			{
				id: m.id as string,
				full_name:
					cleanText([m.first_name, m.last_name].filter(Boolean).join(' ')) ??
					cleanText(m.name),
				person_type: m.person_type as string,
				email: m.user_id ? (emails.get(m.user_id as string) ?? null) : null,
			},
		]),
	);

	return rows.map((r) => ({ ...r, member: byId.get(r.member_id) ?? null }));
}

/** Responsible party vigente de la empresa (end_date null) o null. */
export async function getCurrentResponsibleParty(
	supabase: SupabaseClient,
	companyId: string,
): Promise<ResponsiblePartyRow | null> {
	const { data, error } = await supabase
		.from('irs_responsible_party')
		.select('*')
		.eq('company_id', companyId)
		.is('end_date', null)
		.maybeSingle<ResponsiblePartyRow>();
	if (error) throw error;
	if (!data) return null;

	const [resolved] = await resolveMembers(supabase, [data]);
	return resolved ?? null;
}

/** Historial completo (vigente primero). */
export async function listResponsiblePartyHistory(
	supabase: SupabaseClient,
	companyId: string,
): Promise<ResponsiblePartyRow[]> {
	const { data, error } = await supabase
		.from('irs_responsible_party')
		.select('*')
		.eq('company_id', companyId)
		.order('start_date', { ascending: false });
	if (error) throw error;
	return resolveMembers(supabase, (data ?? []) as ResponsiblePartyRow[]);
}

/**
 * Designa a un member como responsible party del EIN (Form 8822-B).
 * Cierra la vigencia del actual (si existe) e inserta la nueva fila.
 * El member DEBE pertenecer a la empresa (la FK compuesta a company_members lo garantiza en DB).
 */
export async function designateResponsibleParty(
	supabase: SupabaseClient,
	companyId: string,
	memberId: string,
	title: string | null,
	actorUserId: string,
	startDate?: string | null,
): Promise<ResponsiblePartyRow> {
	const { data: membership, error: membershipError } = await supabase
		.from('company_members')
		.select('company_id, member_id')
		.eq('company_id', companyId)
		.eq('member_id', memberId)
		.maybeSingle();
	if (membershipError) throw membershipError;
	if (!membership) throw new Error('MEMBER_NOT_IN_COMPANY');

	const effectiveStart = cleanText(startDate) ?? today();
	const current = await getCurrentResponsibleParty(supabase, companyId);
	if (current) {
		if (current.member_id === memberId) {
			throw new Error('MEMBER_ALREADY_RESPONSIBLE_PARTY');
		}
		const { error: closeError } = await supabase
			.from('irs_responsible_party')
			.update({
				end_date: effectiveStart,
				updated_at: new Date().toISOString(),
			})
			.eq('id', current.id)
			.is('end_date', null);
		if (closeError) throw closeError;

		await recordAuditEvent({
			entityType: 'irs_responsible_party',
			entityId: String(current.id),
			parentType: 'company',
			parentId: companyId,
			action: 'update',
			changedBy: actorUserId,
			beforeData: current,
			afterData: { ...current, end_date: effectiveStart },
		});
	}

	const { data, error } = await supabase
		.from('irs_responsible_party')
		.insert({
			company_id: companyId,
			member_id: memberId,
			title: cleanText(title),
			start_date: effectiveStart,
		})
		.select('*')
		.single<ResponsiblePartyRow>();
	if (error) throw error;

	await recordAuditEvent({
		entityType: 'irs_responsible_party',
		entityId: String(data.id),
		parentType: 'company',
		parentId: companyId,
		action: 'create',
		changedBy: actorUserId,
		afterData: data,
	});

	const [resolved] = await resolveMembers(supabase, [data]);
	return resolved ?? data;
}

/** Cierra la vigencia del responsible party actual sin designar reemplazo. */
export async function endResponsibleParty(
	supabase: SupabaseClient,
	companyId: string,
	actorUserId: string,
	endDate?: string | null,
): Promise<ResponsiblePartyRow> {
	const current = await getCurrentResponsibleParty(supabase, companyId);
	if (!current) throw new Error('RESPONSIBLE_PARTY_NOT_FOUND');

	const effectiveEnd = cleanText(endDate) ?? today();
	const { data, error } = await supabase
		.from('irs_responsible_party')
		.update({ end_date: effectiveEnd, updated_at: new Date().toISOString() })
		.eq('id', current.id)
		.is('end_date', null)
		.select('*')
		.single<ResponsiblePartyRow>();
	if (error) throw error;

	await recordAuditEvent({
		entityType: 'irs_responsible_party',
		entityId: String(data.id),
		parentType: 'company',
		parentId: companyId,
		action: 'update',
		changedBy: actorUserId,
		beforeData: current,
		afterData: data,
	});

	const [resolved] = await resolveMembers(supabase, [data]);
	return resolved ?? data;
}
