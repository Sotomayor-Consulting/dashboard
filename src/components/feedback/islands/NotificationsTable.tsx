import * as React from 'react';
import { Avatar, AvatarFallback } from '@components/ui/Avatar';
import { Badge } from '@components/ui/Badge';
import { Button, buttonVariants } from '@components/ui/Button';
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@components/ui/Dialog';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@components/ui/DropdownMenu';
import { Input } from '@components/ui/Input';
import { ScrollArea } from '@components/ui/ScrollArea';
import { Separator } from '@components/ui/Separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@components/ui/Tabs';
import { cn } from '@components/utils';
import {
	Bell,
	CheckCheck,
	EllipsisVertical,
	ExternalLink,
	Inbox,
	Search,
} from 'lucide-react';

interface NotificationItem {
	id: string;
	user_id?: string;
	type?: string | null;
	title?: string | null;
	message?: string | null;
	action_url?: string | null;
	action_label?: string | null;
	created_at?: string | null;
	read_at?: string | null;
}

interface NotificationsTableProps {
	notificaciones: NotificationItem[];
}

type FilterValue = 'all' | 'unread' | 'read';

function formatDate(value?: string | null) {
	if (!value) return '—';
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return value;

	return new Intl.DateTimeFormat('es-ES', {
		day: '2-digit',
		month: 'short',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	}).format(date);
}

function stripHtml(value?: string | null) {
	if (!value) return '';

	return value
		.replace(/<[^>]*>/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

function getInitials(notification: NotificationItem) {
	const source = notification.type || notification.title || 'SC';
	return source
		.split(/\s+/)
		.slice(0, 2)
		.map((chunk) => chunk[0]?.toUpperCase() ?? '')
		.join('');
}

function NotificationDetail({
	notification,
	scrollable = false,
	onToggleRead,
}: {
	notification: NotificationItem | null;
	scrollable?: boolean;
	onToggleRead?: (notification: NotificationItem, nextRead: boolean) => void;
}) {
	if (!notification) {
		return (
			<div className="bg-background flex h-full flex-col items-center justify-center gap-4 px-8 text-center">
				<div className="border-border bg-muted/40 flex size-14 items-center justify-center rounded-2xl border">
					<Inbox className="text-muted-foreground size-5" />
				</div>
				<div className="space-y-1.5">
					<p className="text-foreground text-sm font-medium">
						Selecciona una notificación
					</p>
					<p className="text-muted-foreground mx-auto max-w-xs text-sm leading-6">
						Revisa el contenido completo y sus acciones.
					</p>
				</div>
			</div>
		);
	}

	const isRead = Boolean(notification.read_at);

	const content = (
		<div className="space-y-5 p-5">
			<div className="max-w-3xl rounded-[24px] border border-black/10 bg-neutral-50 px-5 py-4 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
				<div className="text-muted-foreground mb-3 flex items-center gap-2 text-[11px] font-medium tracking-[0.18em] uppercase">
					<span className="inline-flex h-2 w-2 rounded-full bg-black/30 dark:bg-white/30" />
					Mensaje
				</div>
				<div
					className="text-foreground/80 [&_a]:text-foreground text-sm leading-7 [&_a]:font-medium [&_a]:underline"
					dangerouslySetInnerHTML={{
						__html:
							notification.message ??
							'No se pudo leer el contenido de la notificación.',
					}}
				/>

				{notification.action_url && (
					<div className="pt-4">
						<a
							className={cn(
								buttonVariants({ variant: 'outline', size: 'sm' }),
								'gap-2 rounded-full p-4',
							)}
							href={notification.action_url}
							target="_blank"
							rel="noreferrer noopener"
						>
							{notification.action_label ?? 'Abrir enlace'}
							<ExternalLink className="size-4" />
						</a>
					</div>
				)}
			</div>
		</div>
	);

	return (
		<div className="bg-background flex h-full min-h-0 flex-col overflow-hidden">
			<Separator />

			<div className="flex items-start gap-4 p-5">
				<Avatar size="lg" className="rounded-2xl">
					<AvatarFallback className="bg-muted text-foreground rounded-2xl text-xs font-semibold">
						{getInitials(notification)}
					</AvatarFallback>
				</Avatar>

				<div className="min-w-0 flex-1 space-y-1.5">
					<div className="flex items-start justify-between gap-4">
						<div className="space-y-1">
							<h3 className="text-foreground text-base font-semibold">
								{notification.title || 'Notificación'}
							</h3>
							<p className="text-muted-foreground text-xs tracking-[0.18em] uppercase">
								{notification.type || 'General'}
							</p>
						</div>
						<Badge variant={isRead ? 'secondary' : 'warning'}>
							{isRead ? 'Leida' : 'Nueva'}
						</Badge>
					</div>

					<p className="text-muted-foreground text-xs">
						{formatDate(notification.created_at)}
					</p>
				</div>
				<div className="flex items-center gap-2 p-2">
					<Button
						variant="ghost"
						size="icon"
						title={isRead ? 'Marcar como no leída' : 'Marcar como leída'}
						onClick={() => onToggleRead?.(notification, !isRead)}
					>
						<CheckCheck className="size-4" />
						<span className="sr-only">
							{isRead ? 'Marcar como no leída' : 'Marcar como leída'}
						</span>
					</Button>

					{notification.action_url && (
						<a
							className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }))}
							href={notification.action_url}
							target="_blank"
							rel="noreferrer noopener"
							title={notification.action_label ?? 'Abrir enlace'}
						>
							<ExternalLink className="size-4" />
							<span className="sr-only">Abrir enlace</span>
						</a>
					)}
				</div>
			</div>

			<Separator />

			{scrollable ? (
				<ScrollArea className="min-h-0 flex-1">{content}</ScrollArea>
			) : (
				<div className="min-h-0 flex-1 overflow-hidden">{content}</div>
			)}
		</div>
	);
}

export default function NotificationsTable({
	notificaciones,
}: NotificationsTableProps) {
	const [items, setItems] = React.useState<NotificationItem[]>(notificaciones);
	const [query, setQuery] = React.useState('');
	const [filter, setFilter] = React.useState<FilterValue>('all');
	const [selectedId, setSelectedId] = React.useState<string | null>(null);
	const [mobileDetailOpen, setMobileDetailOpen] = React.useState(false);

	React.useEffect(() => {
		setItems(notificaciones);
	}, [notificaciones]);

	const stats = React.useMemo(() => {
		const unread = items.filter((item) => !item.read_at).length;
		return {
			total: items.length,
			unread,
			read: Math.max(0, items.length - unread),
		};
	}, [items]);

	const filtered = React.useMemo(() => {
		const q = query.trim().toLowerCase();

		return items.filter((item) => {
			const searchableText = [
				item.title,
				stripHtml(item.message),
				item.action_label,
				item.type,
			]
				.filter(Boolean)
				.join(' ')
				.toLowerCase();

			if (q && !searchableText.includes(q)) return false;
			if (filter === 'unread') return !item.read_at;
			if (filter === 'read') return Boolean(item.read_at);

			return true;
		});
	}, [filter, items, query]);

	const updateNotificationReadState = React.useCallback(
		async (notification: NotificationItem, nextRead: boolean) => {
			const previousItems = items;
			const nextItems = items.map((item) =>
				item.id === notification.id
					? {
							...item,
							read_at: nextRead ? new Date().toISOString() : null,
						}
					: item,
			);

			setItems(nextItems);

			try {
				const formData = new FormData();
				formData.append('id', notification.id);
				formData.append('estado_lectura', String(nextRead));

				const response = await fetch(
					'/api/notifications/update?back=/notifications',
					{
						method: 'POST',
						body: formData,
						credentials: 'include',
						headers: {
							accept: 'application/json',
							'x-requested-with': 'XMLHttpRequest',
						},
					},
				);

				const result = (await response.json()) as {
					ok?: boolean;
					error?: string;
				};

				if (!response.ok || !result.ok) {
					throw new Error(
						result.error ?? 'No se pudo actualizar la notificación',
					);
				}
			} catch (error) {
				console.error('[notifications] update read state error:', error);
				setItems(previousItems);
			}
		},
		[items],
	);

	const selectedNotification = React.useMemo(() => {
		if (!selectedId) return null;
		return filtered.find((item) => item.id === selectedId) ?? null;
	}, [filtered, selectedId]);

	React.useEffect(() => {
		if (!selectedId) {
			return;
		}

		if (!selectedNotification) {
			setSelectedId(null);
		}
	}, [selectedId, selectedNotification]);

	const handleSelectNotification = (notification: NotificationItem) => {
		setSelectedId(notification.id);

		if (!notification.read_at) {
			void updateNotificationReadState(notification, true);
		}

		if (window.matchMedia('(max-width: 1023px)').matches) {
			setMobileDetailOpen(true);
		}
	};

	const renderList = (items: NotificationItem[]) => {
		if (!items.length) {
			return (
				<div className="flex h-[calc(100vh-20rem)] min-h-[420px] flex-col items-center justify-center gap-3 p-8 text-center">
					<div className="border-border bg-muted/40 flex size-12 items-center justify-center rounded-2xl border">
						<Bell className="text-muted-foreground size-5" />
					</div>
					<div className="space-y-1">
						<p className="text-foreground text-sm font-medium">
							No encontramos notificaciones
						</p>
						<p className="text-muted-foreground text-sm">
							Prueba con otro termino de búsqueda o cambia el filtro actual.
						</p>
					</div>
				</div>
			);
		}

		return (
			<ScrollArea className="h-full">
				<div className="flex flex-col pt-0">
					{items.map((notification) => {
						const isRead = Boolean(notification.read_at);
						const isActive = selectedNotification?.id === notification.id;

						return (
							<div
								key={notification.id}
								className={cn(
									'flex items-start gap-1 p-3 text-left transition-all',
									isActive
										? 'border-border bg-neutral-200 dark:bg-white/10'
										: 'dark:hover:bg-hover hover:text-accent-foreground border-transparent hover:bg-neutral-100',
								)}
							>
								<button
									type="button"
									onClick={() => handleSelectNotification(notification)}
									className="flex min-w-0 flex-1 items-start gap-3 text-left"
								>
									<Avatar size="sm" className="mt-0.5 rounded-xl">
										<AvatarFallback className="bg-muted text-foreground rounded-xl text-[10px] font-semibold">
											{getInitials(notification)}
										</AvatarFallback>
									</Avatar>

									<div className="min-w-0 flex-1 space-y-1.5">
										<div className="flex items-center">
											<div
												className={cn(
													'w-4/11 truncate font-medium',
													!isRead && 'font-semibold',
												)}
											>
												{notification.title || 'Notificación'}
											</div>
											{!isRead && (
												<div className="relative mr-2 flex h-3 w-3 items-center justify-center">
													<span className="absolute -top-1 -left-41 h-2 w-2 animate-ping rounded-full bg-emerald-500 dark:border-gray-950" />
													<span className="absolute -top-1 -left-41 h-2 w-2 rounded-full border-2 border-white bg-emerald-500 dark:border-gray-950" />
												</div>
											)}
										</div>

										<div className="text-muted-foreground text-xs font-medium tracking-[0.16em] uppercase">
											{notification.type || 'General'}
										</div>

										<div className="text-muted-foreground line-clamp-2 text-xs leading-6">
											{stripHtml(notification.message) ||
												'Sin contenido disponible.'}
										</div>
										<div className="text-muted-foreground ml-auto w-full text-xs">
											{formatDate(notification.created_at)}
										</div>
									</div>
								</button>

								<DropdownMenu>
									<DropdownMenuTrigger
										render={
											<Button variant="ghost" size="icon" className="size-8" />
										}
									>
										<EllipsisVertical className="size-4" />
										<span className="sr-only">Abrir acciones</span>
									</DropdownMenuTrigger>
									<DropdownMenuContent align="end" className="w-48">
										<DropdownMenuItem
											onClick={() =>
												void updateNotificationReadState(notification, !isRead)
											}
										>
											<CheckCheck className="size-4" />
											{isRead ? 'Marcar como no leída' : 'Marcar como leída'}
										</DropdownMenuItem>

										<DropdownMenuItem
											onClick={() => handleSelectNotification(notification)}
										>
											Ver detalle
										</DropdownMenuItem>

										{notification.action_url && (
											<DropdownMenuItem
												render={
													<a
														href={notification.action_url}
														target="_blank"
														rel="noreferrer noopener"
													/>
												}
											>
												Abrir enlace
											</DropdownMenuItem>
										)}
									</DropdownMenuContent>
								</DropdownMenu>
							</div>
						);
					})}
				</div>
			</ScrollArea>
		);
	};

	return (
		<>
			<div className="bg-background flex h-full min-h-0 w-full flex-col overflow-hidden rounded-2xl shadow-sm">
				<div className="flex items-center px-4 py-3">
					<div>
						<h2 className="text-foreground text-xl font-bold">
							Notificaciones
						</h2>
						<p className="text-muted-foreground text-sm">
							Visualiza toda tus notificaciones.
						</p>
					</div>
					<div className="ml-auto hidden items-center gap-2 md:flex">
						<Badge variant="secondary">{stats.total} total</Badge>
						<Badge variant="outline">{stats.unread} sin leer</Badge>
					</div>
				</div>
				<Separator />

				<div className="grid min-h-0 flex-1 overflow-hidden xl:grid-cols-[500px_minmax(0,1fr)]">
					<div className="flex min-h-0 flex-col border-b xl:border-r xl:border-b-0">
						<Tabs
							value={filter}
							onValueChange={(value) => setFilter(value as FilterValue)}
							className="flex min-h-0 flex-1 flex-col gap-0"
						>
							<div className="flex items-center px-4 py-3">
								<h3 className="text-foreground text-sm font-semibold">
									Bandeja
								</h3>
								<TabsList className="ml-auto">
									<TabsTrigger value="all">Todas</TabsTrigger>
									<TabsTrigger value="unread">Sin leer</TabsTrigger>
									<TabsTrigger value="read">Leídas</TabsTrigger>
								</TabsList>
							</div>
							<Separator />

							<div className="bg-background/95 supports-[backdrop-filter]:bg-background/60 p-4 backdrop-blur">
								<div className="relative">
									<Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
									<Input
										placeholder="Buscar"
										value={query}
										onChange={(event) => setQuery(event.target.value)}
										className="pl-8"
									/>
								</div>
							</div>

							<TabsContent value="all" className="m-0 min-h-0 flex-1">
								{renderList(filtered)}
							</TabsContent>
							<TabsContent value="unread" className="m-0 min-h-0 flex-1">
								{renderList(filtered)}
							</TabsContent>
							<TabsContent value="read" className="m-0 min-h-0 flex-1">
								{renderList(filtered)}
							</TabsContent>
						</Tabs>
					</div>

					<div className="hidden h-full overflow-hidden xl:block">
						<NotificationDetail
							notification={selectedNotification}
							onToggleRead={updateNotificationReadState}
						/>
					</div>
				</div>
			</div>

			<Dialog open={mobileDetailOpen} onOpenChange={setMobileDetailOpen}>
				<DialogContent className="max-w-2xl p-0 xl:hidden">
					<DialogHeader className="sr-only">
						<DialogTitle>
							{selectedNotification?.title || 'Detalle de notificacion'}
						</DialogTitle>
						<DialogDescription>Detalle de notificación</DialogDescription>
					</DialogHeader>

					<div className="max-h-[85vh] overflow-hidden rounded-[inherit]">
						<NotificationDetail
							notification={selectedNotification}
							scrollable
							onToggleRead={updateNotificationReadState}
						/>
					</div>

					<div className="border-t px-4 py-4">
						<DialogClose
							render={<Button variant="outline" className="rounded-full" />}
						>
							Cerrar
						</DialogClose>
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
}
