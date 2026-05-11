'use client';

import { useMemo, useState } from 'react';
import { BellIcon, CheckCheck, Eye, ExternalLink } from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@components/ui/Avatar';
import { Badge } from '@components/ui/Badge';
import { Button } from '@components/ui/Button';
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@components/ui/Popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@components/ui/Tabs';

interface NotificationItem {
	id: string;
	message: string;
	is_read: boolean;
	created_at: string;
	link?: string | null;
	mensaje_link?: string | null;
}

interface NotificationsPopoverProps {
	notifications: NotificationItem[];
	totalUnread: number;
	avatarSrc: string;
}

const formatDate = (value: string) => {
	const date = new Date(value);

	if (Number.isNaN(date.getTime())) {
		return '';
	}

	return date.toLocaleDateString();
};

export default function NotificationsPopover({
	notifications,
	totalUnread,
	avatarSrc,
}: NotificationsPopoverProps) {
	const [items, setItems] = useState(notifications);
	const [unreadCount, setUnreadCount] = useState(totalUnread);
	const [pendingIds, setPendingIds] = useState<string[]>([]);

	const unreadItems = useMemo(
		() => items.filter((notification) => !notification.is_read),
		[items],
	);

	const markAsRead = async (id: string) => {
		if (!id || pendingIds.includes(id)) return;

		const previousItems = items;
		const previousCount = unreadCount;

		setPendingIds((current) => [...current, id]);
		setItems((current) =>
			current.map((notification) =>
				notification.id === id
					? { ...notification, is_read: true }
					: notification,
			),
		);
		setUnreadCount((current) => Math.max(0, current - 1));

		try {
			const formData = new FormData();
			formData.append('id', id);
			formData.append('estado_lectura', 'true');

			const response = await fetch('/api/notifications/update', {
				method: 'POST',
				body: formData,
				credentials: 'include',
			});

			if (!response.ok) {
				throw new Error(await response.text());
			}
		} catch (error) {
			console.error('[notifications] marcar como leida error:', error);
			setItems(previousItems);
			setUnreadCount(previousCount);
		} finally {
			setPendingIds((current) =>
				current.filter((pendingId) => pendingId !== id),
			);
		}
	};

	const markAllRead = async () => {
		const unreadIds = unreadItems.map((notification) => notification.id);

		if (unreadIds.length === 0) return;

		const previousItems = items;
		const previousCount = unreadCount;

		setPendingIds((current) => [...new Set([...current, ...unreadIds])]);
		setItems((current) =>
			current.map((notification) => ({ ...notification, is_read: true })),
		);
		setUnreadCount((current) => Math.max(0, current - unreadIds.length));

		try {
			await Promise.all(
				unreadIds.map(async (id) => {
					const formData = new FormData();
					formData.append('id', id);
					formData.append('estado_lectura', 'true');

					const response = await fetch('/api/notifications/update', {
						method: 'POST',
						body: formData,
						credentials: 'include',
					});

					if (!response.ok) {
						throw new Error(await response.text());
					}
				}),
			);
		} catch (error) {
			console.error('[notifications] marcar todas como leidas error:', error);
			setItems(previousItems);
			setUnreadCount(previousCount);
		} finally {
			setPendingIds([]);
		}
	};

	const NotificationRow = ({
		notification,
	}: {
		notification: NotificationItem;
	}) => {
		const isPending = pendingIds.includes(notification.id);

		return (
			<div className="hover:bg-muted/50 flex gap-3 px-4 py-3 transition-colors">
				<div className="relative h-fit shrink-0">
					<Avatar className="h-10 w-10 border border-gray-200 dark:border-gray-700">
						<AvatarImage
							src={avatarSrc}
							alt="Logo notificacion Sotomayor Consulting"
						/>
						<AvatarFallback>SC</AvatarFallback>
					</Avatar>
					{!notification.is_read && (
						<>
							<span className="absolute -right-0.5 -bottom-0.5 h-3 w-3 animate-ping rounded-full bg-emerald-500 dark:border-gray-950" />
							<span className="absolute -right-0.5 -bottom-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-500 dark:border-gray-950" />
						</>
					)}
				</div>
				<div className="min-w-0 flex-1">
					<p className="text-sm leading-snug font-semibold text-gray-900 dark:text-white">
						{notification.message}
					</p>
					<div className="mt-3 flex flex-wrap items-center gap-2">
						{notification.link && notification.mensaje_link && (
							<Button
								variant="default"
								size="sm"
								className="h-auto gap-1.5 px-2 py-1 text-xs"
								render={
									<a
										href={notification.link}
										target="_blank"
										rel="noreferrer noopener"
									/>
								}
							>
								{notification.mensaje_link}
								<ExternalLink className="h-3.5 w-3.5" />
							</Button>
						)}
						{!notification.is_read && (
							<Button
								variant="ghost"
								size="sm"
								className="mark-as-read text-primary-600 hover:bg-primary-50 hover:text-primary-700 dark:hover:text-primary-400 h-auto cursor-pointer px-2 py-1 text-xs font-medium dark:text-neutral-400"
								onClick={() => markAsRead(notification.id)}
								disabled={isPending}
								data-id={notification.id}
							>
								Marcar como leída
							</Button>
						)}
					</div>
					<p className="mt-2 text-xs text-gray-400">
						{formatDate(notification.created_at)}
					</p>
				</div>
			</div>
		);
	};

	return (
		<Popover>
			<PopoverTrigger
				render={
					<Button
						variant="ghost"
						size="icon"
						id="notifications-toggle"
						className="relative h-9 w-9 cursor-pointer rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-300 dark:hover:bg-[#101522] dark:hover:text-white"
					/>
				}
			>
				<BellIcon className="h-5 w-5" />
				{unreadCount > 0 && (
					<Badge className="text-2xs absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-red-500 p-0 font-bold text-white dark:border-[#223848]">
						{unreadCount}
					</Badge>
				)}
				<span className="sr-only">Ver notificaciones</span>
			</PopoverTrigger>

			<PopoverContent
				align="end"
				sideOffset={10}
				className="to-black-600 from-black-900 z-20 w-[24rem] max-w-sm gap-0 overflow-hidden rounded-xl border border-gray-200 bg-white p-0 shadow-xl ring-0 dark:border-gray-700 dark:bg-linear-to-tr"
			>
				<div className="to-black-600 from-black-900 flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-linear-to-tl">
					<div className="flex items-center gap-2">
						<span className="text-sm font-semibold text-gray-900 dark:text-white">
							Notificaciones
						</span>
						{unreadCount > 0 && (
							<Badge variant="secondary" className="px-1.5 py-0 text-[11px]">
								{unreadCount} nuevas
							</Badge>
						)}
					</div>
					{unreadCount > 0 && (
						<Button
							variant="ghost"
							size="sm"
							onClick={markAllRead}
							className="text-muted-foreground hover:text-foreground h-auto cursor-pointer px-2 py-1 text-xs"
						>
							<CheckCheck className="h-3.5 w-3.5" />
							Marcar todo
						</Button>
					)}
				</div>

				<Tabs defaultValue="all" className="gap-0">
					<div className="border-b border-gray-200 px-4 py-2 dark:border-gray-700">
						<TabsList className="dark:bg-black-900 h-auto w-full rounded-lg border border-gray-200 bg-white p-1 text-xs font-medium shadow-sm shadow-gray-200/70 dark:border-gray-700 dark:shadow-none">
							<TabsTrigger
								value="all"
								className="dark:data-active:bg-black-700 inline-flex h-auto w-full flex-1 items-center justify-center gap-2 rounded-md border-none p-0 text-gray-600 shadow-none transition-colors after:hidden hover:bg-gray-100 hover:text-gray-900 focus-visible:ring-0 focus-visible:outline-none data-active:bg-gray-100 data-active:text-gray-900 data-active:shadow-sm dark:text-gray-300 dark:hover:bg-white/5 dark:hover:text-white dark:data-active:text-white"
							>
								Todas
							</TabsTrigger>
							<TabsTrigger
								value="unread"
								className="dark:data-active:bg-black-700 inline-flex h-auto flex-1 items-center justify-center gap-2 rounded-md border-none p-0 text-gray-600 shadow-none transition-colors after:hidden hover:bg-gray-100 hover:text-gray-900 focus-visible:ring-0 focus-visible:outline-none data-active:bg-gray-100 data-active:text-gray-900 data-active:shadow-sm dark:text-gray-300 dark:hover:bg-white/5 dark:hover:text-white dark:data-active:text-white"
							>
								Sin leer
								{unreadCount > 0 && <span>({unreadCount})</span>}
							</TabsTrigger>
						</TabsList>
					</div>

					<TabsContent value="all" className="mt-0">
						<div id="notifications-list" className="h-96 overflow-y-auto">
							{items.length > 0 ? (
								<div className="divide-y divide-gray-100 dark:divide-gray-700">
									{items.map((notification) => (
										<NotificationRow
											key={notification.id}
											notification={notification}
										/>
									))}
								</div>
							) : (
								<div className="flex px-4 py-6 text-sm text-neutral-500 dark:text-neutral-500">
									No hay notificaciones
								</div>
							)}
						</div>
					</TabsContent>

					<TabsContent value="unread" className="mt-0">
						<div className="h-96 overflow-y-auto">
							{unreadItems.length > 0 ? (
								<div className="divide-y divide-gray-100 dark:divide-gray-700">
									{unreadItems.map((notification) => (
										<NotificationRow
											key={notification.id}
											notification={notification}
										/>
									))}
								</div>
							) : (
								<div className="flex h-96 flex-col items-center justify-center gap-2 px-4 text-center">
									<BellIcon className="h-8 w-8 text-gray-300 dark:text-gray-600" />
									<p className="text-sm text-gray-500 dark:text-gray-400">
										Estas al dia con tus notificaciones.
									</p>
								</div>
							)}
						</div>
					</TabsContent>
				</Tabs>

				<div className="border-t border-gray-200 px-4 py-3 dark:border-gray-700">
					<Button
						variant="ghost"
						size="sm"
						className="w-full cursor-pointer text-sm"
						render={<a href="/notifications" />}
					>
						<Eye className="h-4 w-4" />
						Ver todo
					</Button>
				</div>
			</PopoverContent>
		</Popover>
	);
}
