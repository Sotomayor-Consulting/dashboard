import type { SupabaseClient } from '@supabase/supabase-js';
import { createLogger } from '@infrastructure/logging';

const log = createLogger('domains.notifications');

// La tabla vive en el schema `shared` (ver migración move_notifications_to_shared_schema).
const notificationsTable = (supabase: SupabaseClient) =>
	supabase.schema('shared').from('notifications');

const NOTIFICATION_COLUMNS = `
    id,
    user_id,
    type,
    title,
    message,
    read_at,
    action_url,
    action_label,
    metadata,
    created_at
  `;

export type NotificationRow = {
	id: string;
	user_id: string;
	type: string;
	title: string;
	message: string;
	read_at: string | null;
	action_url: string | null;
	action_label: string | null;
	metadata: Record<string, unknown> | null;
	created_at: string | null;
};

export const getNotifications = async (
	supabase: SupabaseClient,
	userId: string,
) => {
	if (!userId) {
		return { notifications: [], totalUnread: 0 };
	}

	// Primero obtener el total de no leídas (sin límite)
	const { count: totalNoLeidas } = await notificationsTable(supabase)
		.select('*', { count: 'exact', head: true })
		.eq('user_id', userId)
		.is('read_at', null);

	// Luego obtener las notificaciones
	const { data, error } = await notificationsTable(supabase)
		.select(NOTIFICATION_COLUMNS)
		.eq('user_id', userId)
		.order('created_at', { ascending: false });

	if (error || !data) {
		return { notifications: [], totalUnread: 0 };
	}

	const notifications = data as NotificationRow[];

	return { notifications, totalUnread: totalNoLeidas ?? 0 };
};

export const markNotificationAsRead = async (
	supabase: SupabaseClient,
	notificationId: string,
	userId: string,
) => {
	const { error } = await notificationsTable(supabase)
		.update({ read_at: new Date().toISOString() })
		.eq('id', notificationId)
		.eq('user_id', userId);

	if (error) {
		return { success: false, error };
	}

	return { success: true, error: null };
};

export const getNotificationsGeneral = async (supabase: SupabaseClient) => {
	const { data, error } = await notificationsTable(supabase)
		.select(NOTIFICATION_COLUMNS, { count: 'exact' })
		.order('created_at', { ascending: false });
	if (error) {
		log.error('Error fetching notificaciones', { error });
		throw error;
	}

	return data as NotificationRow[];
};

export const getNotificationsGeneralPorId = async (
	supabase: SupabaseClient,
	userId: string,
) => {
	const { data, error } = await notificationsTable(supabase)
		.select(NOTIFICATION_COLUMNS, { count: 'exact' })
		.eq('user_id', userId)
		.order('created_at', { ascending: false });
	if (error) {
		log.error('Error fetching notificaciones', { error });
		throw error;
	}

	return data as NotificationRow[];
};
