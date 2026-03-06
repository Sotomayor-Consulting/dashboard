import { supabase } from '@lib/supabase';

export const getNotifications = async (userId: string, limit = 5) => {
	if (!userId) {
		return { notifications: [], totalUnread: 0 };
	}

	const { data, error } = await supabase
		.from('notifications')
		.select('*')
		.eq('user_id', userId)
		.order('created_at', { ascending: false })
		.limit(limit);

	if (error || !data) {
		return { notifications: [], totalUnread: 0 };
	}

	const notifications = data || [];
	const totalUnread = notifications.filter((n) => !n.is_read).length;

	return { notifications, totalUnread };
};

export const markNotificationAsRead = async (
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

export const getNotificacionesGeneral = async () => {
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

export const getNotificacionesGeneralPorId = async (userId: string) => {
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
