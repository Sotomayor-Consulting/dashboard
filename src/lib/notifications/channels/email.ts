import { sendMail } from '@lib/mailing/mailer';
import { supabaseAdmin } from '@lib/supabase/admin';

type ResolveEmailInput = {
	userId: string;
	email?: string | null;
};

type SendEmailInput = {
	userId: string;
	email?: string | null;
	subject: string;
	html: string;
	text?: string;
};

export async function resolveRecipientEmail({
	userId,
	email,
}: ResolveEmailInput): Promise<string | null> {
	if (email && email.trim()) return email.trim();

	const { data: userRow, error: userErr } = await supabaseAdmin
		.from('usuarios')
		.select('correo')
		.eq('user_id', userId)
		.maybeSingle();

	if (!userErr && userRow?.correo) {
		return String(userRow.correo).trim();
	}

	const { data: authUserRes, error: authErr } =
		await supabaseAdmin.auth.admin.getUserById(userId);

	if (authErr || !authUserRes?.user?.email) {
		return null;
	}

	return authUserRes.user.email.trim();
}

export async function sendEmailNotification({
	userId,
	email,
	subject,
	html,
	text,
}: SendEmailInput): Promise<{ to: string }> {
	const recipient = await resolveRecipientEmail({ userId, email });

	if (!recipient) {
		throw new Error('No se encontro un correo para el destinatario');
	}

	await sendMail({
		to: recipient,
		subject,
		html,
		text,
	});

	return { to: recipient };
}
