'use client';

import { useMemo, useState } from 'react';
import {
	BellIcon,
	CheckCheck,
	Eye,
	ChevronRight,
	EllipsisVertical,
} from 'lucide-react';

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
	title?: string;
	type?: string;
	read_at?: string | null;
	created_at: string;
	action_url?: string | null;
	action_label?: string | null;
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

	const diffMs = Date.now() - date.getTime();

	if (diffMs < 0) {
		return '0m';
	}

	const minute = 60 * 1000;
	const hour = 60 * minute;
	const day = 24 * hour;

	if (diffMs < hour) {
		return `${Math.max(1, Math.floor(diffMs / minute))}m`;
	}

	if (diffMs < day) {
		return `${Math.floor(diffMs / hour)}h`;
	}

	return `${Math.floor(diffMs / day)}d`;
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
		() => items.filter((notification) => !notification.read_at),
		[items],
	);

	const markAsRead = async (id: string) => {
		if (!id || pendingIds.includes(id)) return;

		const previousItems = items;
		const previousCount = unreadCount;

		setPendingIds((current) => [...current, id]);
		const readAt = new Date().toISOString();
		setItems((current) =>
			current.map((notification) =>
				notification.id === id
					? { ...notification, read_at: readAt }
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
		const readAt = new Date().toISOString();
		setItems((current) =>
			current.map((notification) => ({ ...notification, read_at: readAt })),
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
			<div className="group/card hover:bg-white-50 flex gap-3 px-4 py-3 transition-colors dark:hover:bg-neutral-900">
				<div className="relative h-fit shrink-0">
					<Avatar className="h-10 w-10 border border-gray-200 dark:border-gray-700">
						<AvatarImage
							src={avatarSrc}
							alt="Logo notificación Sotomayor Consulting"
						/>
						<AvatarFallback>SC</AvatarFallback>
					</Avatar>
					{!notification.read_at && (
						<>
							<span className="absolute -right-0.5 bottom-11 h-3 w-3 animate-ping rounded-full bg-emerald-500 dark:border-gray-950" />
							<span className="absolute -right-0.5 bottom-11 h-3 w-3 rounded-full border-2 border-white bg-emerald-500 dark:border-gray-950" />
						</>
					)}
					<p className="text-center text-xs text-gray-400">
						{formatDate(notification.created_at)}
					</p>
				</div>
				<a
					className="min-w-0 flex-1"
					href={notification.action_url ?? undefined}
					title={notification.action_label ?? undefined}
					target="_blank"
					rel="noreferrer noopener"
				>
					{notification.title && (
						<p className="text-xs leading-snug font-semibold text-gray-900 dark:text-white">
							{notification.title}
						</p>
					)}
					{/* message viene sanitizado desde el servidor (shared/sanitize) */}
					<div
						className="[&_a]:text-primary-600 text-xs leading-snug text-gray-600 dark:text-gray-300 [&_a]:underline"
						dangerouslySetInnerHTML={{ __html: notification.message }}
					/>
				</a>
				<div className="relative flex flex-col justify-between">
					{!notification.read_at && (
						<Popover>
							<PopoverTrigger
								render={
									<Button
										variant="ghost"
										size="sm"
										className="mark-as-read text-primary-600 hover:bg-primary-50 hover:text-primary-700 dark:hover:text-primary-400 h-auto cursor-pointer px-2 py-1 text-xs font-medium dark:text-neutral-400"
										disabled={isPending}
										data-id={notification.id}
										onClick={(event) => {
											event.preventDefault();
											event.stopPropagation();
										}}
									/>
								}
							>
								<EllipsisVertical
									className="h-3.5 w-3.5"
									xlinkTitle="Marcar como leído"
								/>
							</PopoverTrigger>
							<PopoverContent
								align="end"
								side="bottom"
								sideOffset={8}
								className="w-56 gap-3 rounded-xl border border-gray-200 bg-white text-xs shadow-lg dark:border-gray-700 dark:bg-black"
								onClick={(event) => {
									event.preventDefault();
									event.stopPropagation();
								}}
							>
								<Button
									variant="ghost"
									size="sm"
									className="bg-primary-50 text-primary-700 hover:bg-primary-100 h-8 w-full cursor-pointer justify-center dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
									onClick={(event) => {
										event.preventDefault();
										event.stopPropagation();
										void markAsRead(notification.id);
									}}
									disabled={isPending}
								>
									{isPending ? 'Marcando...' : 'Marcar como leida'}{' '}
									<CheckCheck
										className="ml-3 h-3.5 w-3.5"
										xlinkTitle="Marcar como leído"
									/>
								</Button>
							</PopoverContent>
						</Popover>
					)}
					<div className="invisible mt-3 flex flex-wrap items-center gap-2 transition-all delay-105 group-hover/card:visible group-hover/card:translate-x-2">
						{notification.action_url && notification.action_label && (
							<Button
								variant="link"
								size="sm"
								className="h-auto gap-1.5 px-2 py-1 text-xs"
								render={
									<a
										href={notification.action_url}
										target="_blank"
										title={notification.action_label}
										rel="noreferrer noopener"
									/>
								}
							>
								<ChevronRight className="h-3.5 w-3.5" />
							</Button>
						)}
					</div>
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
				align="center"
				sideOffset={15}
				className="z-20 w-[24rem] max-w-sm gap-0 overflow-hidden rounded-xl border border-gray-200 bg-white p-0 shadow-xl ring-0 dark:border-gray-700 dark:bg-black"
			>
				<div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-transparent">
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
						<TabsList className="h-auto w-full rounded-lg border border-gray-200 bg-white p-1 text-xs font-medium shadow-sm shadow-gray-200/70 dark:border-gray-700 dark:bg-neutral-950 dark:shadow-none">
							<TabsTrigger
								value="all"
								className="inline-flex h-auto w-full flex-1 items-center justify-center gap-2 rounded-md border-none p-0 text-gray-600 shadow-none transition-colors after:hidden hover:bg-gray-100 hover:text-gray-900 focus-visible:ring-0 focus-visible:outline-none data-active:bg-gray-100 data-active:text-gray-900 data-active:shadow-sm dark:text-gray-300 dark:hover:bg-white/5 dark:hover:text-white dark:data-active:bg-neutral-900 dark:data-active:text-white"
							>
								Todas
							</TabsTrigger>
							<TabsTrigger
								value="unread"
								className="inline-flex h-auto flex-1 items-center justify-center gap-2 rounded-md border-none p-0 text-gray-600 shadow-none transition-colors after:hidden hover:bg-gray-100 hover:text-gray-900 focus-visible:ring-0 focus-visible:outline-none data-active:bg-gray-100 data-active:text-gray-900 data-active:shadow-sm dark:text-gray-300 dark:hover:bg-white/5 dark:hover:text-white dark:data-active:bg-neutral-900 dark:data-active:text-white"
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
