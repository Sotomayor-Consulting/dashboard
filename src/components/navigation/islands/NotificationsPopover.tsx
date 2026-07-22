'use client';

import { useEffect, useMemo, useState } from 'react';
import { BellIcon, CheckCheck, InboxIcon, X } from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@components/ui/Avatar';
import { Badge } from '@components/ui/Badge';
import { Button } from '@components/ui/Button';
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@components/ui/Popover';

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

const formatRelative = (value: string) => {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return '';

	const diffMs = Date.now() - date.getTime();
	if (diffMs < 0) return 'ahora';

	const minute = 60_000;
	const hour = 60 * minute;
	const day = 24 * hour;

	if (diffMs < minute) return 'ahora';
	if (diffMs < hour) return `${Math.max(1, Math.floor(diffMs / minute))} min`;
	if (diffMs < day) return `${Math.floor(diffMs / hour)}h`;
	if (diffMs < 2 * day) return 'ayer';
	if (diffMs < 7 * day) return `${Math.floor(diffMs / day)}d`;

	return new Intl.DateTimeFormat('es', {
		day: 'numeric',
		month: 'short',
	}).format(date);
};

const CATEGORY_LABELS: Record<string, string> = {
	'admin.custom': 'Administración',
	'documents.shared': 'Documentos',
	'documents.share_revoked': 'Documentos',
	'workflow.stage.completed': 'Progreso',
	'workflow.task.assigned': 'Tarea asignada',
	'workflow.planning.doc_uploaded': 'Documentos',
	'workflow.planning.doc_approved': 'Documentos',
	'workflow.planning.doc_rejected': 'Documentos',
};

const formatCategory = (type?: string) =>
	(type && CATEGORY_LABELS[type]) || 'Actualización';

const isGenericTitle = (title?: string) =>
	!title || title === 'Notificación' || title === 'Notificacion';

export default function NotificationsPopover({
	notifications,
	totalUnread,
	avatarSrc,
}: NotificationsPopoverProps) {
	const [items, setItems] = useState(notifications);
	const [unreadCount, setUnreadCount] = useState(totalUnread);
	const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
	const [open, setOpen] = useState(false);

	useEffect(() => {
		setItems(notifications);
	}, [notifications]);
	useEffect(() => {
		setUnreadCount(totalUnread);
	}, [totalUnread]);

	const unreadItems = useMemo(() => items.filter((n) => !n.read_at), [items]);

	const markAsRead = async (id: string) => {
		if (!id || pendingIds.has(id)) return;

		const previousItems = items;
		const previousCount = unreadCount;

		setPendingIds((s) => new Set(s).add(id));
		const readAt = new Date().toISOString();
		setItems((current) =>
			current.map((n) => (n.id === id ? { ...n, read_at: readAt } : n)),
		);
		setUnreadCount((c) => Math.max(0, c - 1));

		try {
			const formData = new FormData();
			formData.append('id', id);
			formData.append('estado_lectura', 'true');

			const response = await fetch('/api/notifications/update', {
				method: 'POST',
				body: formData,
				credentials: 'include',
				headers: {
					accept: 'application/json',
					'x-requested-with': 'XMLHttpRequest',
				},
				keepalive: true,
			});

			if (!response.ok) throw new Error(await response.text());

			const result = (await response.json()) as {
				ok?: boolean;
				error?: string;
			};
			if (!result.ok)
				throw new Error(
					result.error ?? 'No se pudo actualizar la notificación',
				);
		} catch (error) {
			console.error('[notifications] marcar como leída error:', error);
			setItems(previousItems);
			setUnreadCount(previousCount);
		} finally {
			setPendingIds((s) => {
				const next = new Set(s);
				next.delete(id);
				return next;
			});
		}
	};

	const markAllRead = async () => {
		const unreadIds = unreadItems.map((n) => n.id);
		if (unreadIds.length === 0) return;

		const previousItems = items;
		const previousCount = unreadCount;

		setPendingIds((s) => {
			const next = new Set(s);
			for (const id of unreadIds) next.add(id);
			return next;
		});
		const readAt = new Date().toISOString();
		setItems((current) =>
			current.map((n) => ({ ...n, read_at: n.read_at ?? readAt })),
		);
		setUnreadCount(0);

		try {
			const results = await Promise.allSettled(
				unreadIds.map(async (id) => {
					const fd = new FormData();
					fd.append('id', id);
					fd.append('estado_lectura', 'true');
					const res = await fetch('/api/notifications/update', {
						method: 'POST',
						body: fd,
						credentials: 'include',
						headers: {
							accept: 'application/json',
							'x-requested-with': 'XMLHttpRequest',
						},
						keepalive: true,
					});
					if (!res.ok) throw new Error(await res.text());
				}),
			);

			const anyFailed = results.some((r) => r.status === 'rejected');
			if (anyFailed) throw new Error('Some notifications failed to update');
		} catch (error) {
			console.error('[notifications] marcar todas como leídas error:', error);
			setItems(previousItems);
			setUnreadCount(previousCount);
		} finally {
			setPendingIds(new Set());
		}
	};

	const NotificationRow = ({
		notification,
	}: {
		notification: NotificationItem;
	}) => {
		const isUnread = !notification.read_at;

		const handleClick = () => {
			if (isUnread) void markAsRead(notification.id);
		};

		return (
			<a
				href={notification.action_url ?? '/notifications'}
				className="flex gap-3.5 px-5 py-4 transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.03]"
				onClick={handleClick}
			>
				<div className="relative h-fit shrink-0 pt-0.5">
					<Avatar className="h-11 w-11 border border-gray-200 dark:border-gray-700">
						<AvatarImage src={avatarSrc} alt="Sotomayor Consulting" />
						<AvatarFallback>SC</AvatarFallback>
					</Avatar>
					{isUnread && (
						<span className="absolute -bottom-0.5 left-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500 dark:border-black" />
					)}
				</div>

				<div className="min-w-0 flex-1">
					{/* message viene sanitizado desde el servidor (shared/sanitize) */}
					<p
						className={`text-[13px] leading-relaxed ${
							isUnread
								? 'text-gray-900 dark:text-gray-100'
								: 'text-gray-500 dark:text-gray-400'
						}`}
					>
						{!isGenericTitle(notification.title) && (
							<span className="font-semibold">
								{notification.title}{' '}
							</span>
						)}
						<span
							className="[&_a]:underline"
							dangerouslySetInnerHTML={{
								__html: notification.message,
							}}
						/>
					</p>
					<p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">
						{formatCategory(notification.type)}
						{' · '}
						{formatRelative(notification.created_at)}
					</p>
				</div>
			</a>
		);
	};

	return (
		<Popover open={open} onOpenChange={setOpen}>
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
					<Badge
						aria-live="polite"
						className="text-2xs absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-red-500 p-0 font-bold text-white dark:border-[#223848]"
					>
						{unreadCount}
					</Badge>
				)}
				<span className="sr-only">Ver notificaciones</span>
			</PopoverTrigger>

			<PopoverContent
				align="end"
				sideOffset={8}
				className="dark:bg-primary-black z-[60] w-[22rem] max-w-[calc(100vw-1rem)] gap-0 overflow-hidden rounded-2xl border border-gray-200 bg-white p-0 shadow-xl ring-0 dark:border-gray-800"
			>
				{/* Header */}
				<div className="flex items-center justify-between px-5 py-4">
					<span className="text-base font-semibold text-gray-900 dark:text-white">
						Notificaciones
					</span>
					<div className="flex items-center gap-1">
						{unreadCount > 0 && (
							<Button
								variant="ghost"
								size="sm"
								onClick={markAllRead}
								className="text-muted-foreground hover:text-foreground h-auto cursor-pointer px-2 py-1 text-xs"
								title="Marcar todas como leídas"
							>
								<CheckCheck className="h-4 w-4" />
							</Button>
						)}
						<Button
							variant="ghost"
							size="icon"
							className="h-7 w-7 cursor-pointer text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
							onClick={() => setOpen(false)}
						>
							<X className="h-4 w-4" />
							<span className="sr-only">Cerrar</span>
						</Button>
					</div>
				</div>

				{/* List */}
				<div className="max-h-[26rem] overflow-y-auto">
					{items.length > 0 ? (
						<div className="divide-y divide-gray-100 dark:divide-gray-800/60">
							{items.map((notification) => (
								<NotificationRow
									key={notification.id}
									notification={notification}
								/>
							))}
						</div>
					) : (
						<div className="flex flex-col items-center justify-center gap-3 px-4 py-12 text-center">
							<div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-white/5">
								<InboxIcon className="h-6 w-6 text-gray-400 dark:text-gray-500" />
							</div>
							<div>
								<p className="text-sm font-medium text-gray-900 dark:text-white">
									Estás al día
								</p>
								<p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
									No tienes notificaciones aún.
								</p>
							</div>
						</div>
					)}
				</div>

				{/* Footer */}
				<div className="border-t border-gray-200 dark:border-gray-800">
					<a
						href="/notifications"
						className="block py-3.5 text-center text-sm font-medium text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-white"
					>
						Ver todas las notificaciones
					</a>
				</div>
			</PopoverContent>
		</Popover>
	);
}
