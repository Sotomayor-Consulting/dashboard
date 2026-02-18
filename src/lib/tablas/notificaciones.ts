import { supabase } from '@lib/supabase';

export const getNotifications = async (userId: string, limit = 5) => {
	const { data, error } = await supabase
		.from('notifications')
		.select('*')
		.eq('user_id', userId)
		.order('created_at', { ascending: false })
		.limit(limit);

	if (error) {
		console.error('Error fetching notifications:', error);
		return { notifications: [], totalUnread: 0 };
	}

	const notifications = data || [];
	const totalUnread = notifications.filter((n) => !n.is_read).length;

	return { notifications, totalUnread };
};

export const markNotificationAsRead = async (notificationId: string, userId: string) => {
	const { error } = await supabase
		.from('notifications')
		.update({ is_read: true, leido_en: new Date().toISOString() })
		.eq('id', notificationId)
		.eq('user_id', userId);

	if (error) {
		console.error('Error marking notification as read:', error);
		return { success: false, error };
	}

	return { success: true, error: null };
};
