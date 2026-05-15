import type { SupabaseClient } from '@supabase/supabase-js';

export const getNotifications = async (
	supabase: SupabaseClient,
	userId: string,
	limit?: number,
) => {
	if (!userId) {
		return { notifications: [], totalUnread: 0 };
	}

	// Primero obtener el total de no leídas (sin límite)
	const { count: totalNoLeidas } = await supabase
		.from('notifications')
		.select('*', { count: 'exact', head: true })
		.eq('user_id', userId)
		.eq('is_read', false);

	// Luego obtener las notificaciones (con límite opcional)
	let query = supabase
		.from('notifications')
		.select('*')
		.eq('user_id', userId)
		.order('created_at', { ascending: false });

	if (typeof limit === 'number' && limit > 0) {
		query = query.limit(limit);
	}

	const { data, error } = await query;

	if (error || !data) {
		return { notifications: [], totalUnread: 0 };
	}

	const notifications = data || [];

	return { notifications, totalUnread: totalNoLeidas ?? 0 };
};

export const markNotificationAsRead = async (
	supabase: SupabaseClient,
	notificationId: string,
	userId: string,
) => {
	const { error } = await supabase
		.from('notifications')
		.update({ is_read: true, leido_en: new Date().toISOString() })
		.eq('id', notificationId)
		.eq('user_id', userId);

	if (error) {
		return { success: false, error };
	}

	return { success: true, error: null };
};

export const getNotificationsGeneral = async (supabase: SupabaseClient) => {
	const { data, error } = await supabase
		.from('notifications')
		.select(
			`
    id,
    user_id,
    message,
    is_read,
    leido_en,
    created_at,
    link,
	mensaje_link
  `,
			{ count: 'exact' },
		)
		.order('created_at', { ascending: false });
	if (error) {
		console.error('Error fetching notificaciones:', error);
		throw error;
	}

	return data;
};

export const getNotificationsGeneralPorId = async (
	supabase: SupabaseClient,
	userId: string,
) => {
	const { data, error } = await supabase
		.from('notifications')
		.select(
			`
    id,
    user_id,
    message,
    is_read,
    leido_en,
    created_at,
    link,
	mensaje_link
  `,
			{ count: 'exact' },
		)
		.eq('user_id', userId)
		.order('created_at', { ascending: false });
	if (error) {
		console.error('Error fetching notificaciones:', error);
		throw error;
	}

	return data;
};
