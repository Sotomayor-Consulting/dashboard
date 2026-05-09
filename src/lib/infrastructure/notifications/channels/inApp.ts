import { supabaseAdmin } from '@infrastructure/supabase/admin';

type SendInAppInput = {
	userId: string;
	message: string;
	link?: string | null;
	linkLabel?: string | null;
	createdAt?: string;
};

export async function sendInAppNotification({
	userId,
	message,
	link,
	linkLabel,
	createdAt,
}: SendInAppInput): Promise<void> {
	const payload = {
		user_id: userId,
		message,
		link: link ?? null,
		mensaje_link: linkLabel ?? null,
		created_at: createdAt ?? new Date().toISOString(),
	};

	const { error } = await supabaseAdmin.from('notifications').insert(payload);

	if (error) {
		throw new Error(error.message);
	}
}
