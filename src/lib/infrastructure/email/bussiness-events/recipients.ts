import { supabaseAdmin } from '@infrastructure/supabase/admin';
import { resolveRecipientEmail } from '@infrastructure/notifications/channels/email';
import type {
	BusinessEmailCaseContext,
	BusinessEmailRecipient,
} from './types';

type UserProfileRow = {
	nombre?: string | null;
	apellido?: string | null;
	correo?: string | null;
};

function buildFullName(profile: UserProfileRow | null | undefined): string | null {
	const firstName = String(profile?.nombre ?? '').trim();
	const lastName = String(profile?.apellido ?? '').trim();
	const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();
	return fullName || null;
}

export async function resolveBusinessCaseContext(
	caseId: string,
): Promise<BusinessEmailCaseContext | null> {
	const { data, error } = await supabaseAdmin
		.from('empresas_incorporaciones')
		.select(
			'empresa_incorporacion_id, user_id, nombre_1, usuarios:user_id(nombre, apellido, correo)',
		)
		.eq('empresa_incorporacion_id', caseId)
		.maybeSingle();

	if (error || !data?.user_id) {
		return null;
	}

	const profile = (data.usuarios as UserProfileRow | null | undefined) ?? null;
	const clientEmail = profile?.correo?.trim()
		? await resolveRecipientEmail({
				userId: data.user_id as string,
				email: profile.correo,
			})
		: await resolveRecipientEmail({ userId: data.user_id as string });

	return {
		caseId: data.empresa_incorporacion_id as string,
		companyName: String(data.nombre_1 ?? '').trim() || 'su incorporacion',
		clientUserId: data.user_id as string,
		clientName: buildFullName(profile),
		clientEmail,
	};
}

export async function resolveOperationsRecipients(): Promise<
	BusinessEmailRecipient[]
> {
	const { data, error } = await supabaseAdmin
		.from('user_roles')
		.select('user_id, usuarios:user_id(nombre, apellido, correo), roles!inner(name)')
		.eq('roles.name', 'operaciones');

	if (error || !data) {
		return [];
	}

	const recipients: BusinessEmailRecipient[] = [];

	for (const row of data as Array<{
		user_id: string | null;
		usuarios?: UserProfileRow | null;
	}>) {
		if (!row.user_id) continue;

		const email = row.usuarios?.correo?.trim()
			? await resolveRecipientEmail({
					userId: row.user_id,
					email: row.usuarios.correo,
				})
			: await resolveRecipientEmail({ userId: row.user_id });
		if (!email) continue;

		recipients.push({
			userId: row.user_id,
			email,
			name: buildFullName(row.usuarios),
			role: 'operations',
		});
	}

	return recipients;
}

export function buildClientRecipient(
	context: BusinessEmailCaseContext,
): BusinessEmailRecipient | null {
	if (!context.clientEmail) {
		return null;
	}

	return {
		userId: context.clientUserId,
		email: context.clientEmail,
		name: context.clientName,
		role: 'client',
	};
}

export function dedupeBusinessRecipients(
	recipients: BusinessEmailRecipient[],
): BusinessEmailRecipient[] {
	const unique = new Map<string, BusinessEmailRecipient>();

	for (const recipient of recipients) {
		const emailKey = recipient.email.trim().toLowerCase();
		const userKey = recipient.userId.trim();
		const key = emailKey || userKey;
		if (!key || unique.has(key)) continue;
		unique.set(key, recipient);
	}

	return [...unique.values()];
}
