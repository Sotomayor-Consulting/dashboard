import { supabaseAdmin } from '@infrastructure/supabase/admin';
import { sanitizeNotificationHtml } from '@shared/sanitize';

type SendInAppInput = {
	userId: string;
	message: string;
	type?: string | undefined;
	title?: string | undefined;
	actionUrl?: string | null;
	actionLabel?: string | null;
	metadata?: Record<string, unknown> | null;
	createdAt?: string | undefined;
};

export async function sendInAppNotification({
	userId,
	message,
	type,
	title,
	actionUrl,
	actionLabel,
	metadata,
	createdAt,
}: SendInAppInput): Promise<void> {
	const payload = {
		user_id: userId,
		message: sanitizeNotificationHtml(message),
		type: type ?? 'general',
		title: title ?? 'Notificación',
		action_url: actionUrl ?? null,
		action_label: actionLabel ?? null,
		metadata: metadata ?? {},
		created_at: createdAt ?? new Date().toISOString(),
	};

	const { error } = await supabaseAdmin
		.schema('shared')
		.from('notifications')
		.insert(payload);

	if (error) {
		throw new Error(error.message);
	}
}
