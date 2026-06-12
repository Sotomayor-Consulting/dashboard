import * as React from 'react';
import { Badge } from '@components/ui/Badge';
import { Button } from '@components/ui/Button';
import { Input } from '@components/ui/Input';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@components/ui/DropdownMenu';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@components/ui/Table';
import { buttonVariants } from '@components/ui/Button';
import { cn } from '@components/utils';

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

const PAGE_SIZE = 10;

function formatDate(value?: string | null) {
	if (!value) return '—';
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return value;
	return date.toLocaleDateString('es-ES').replace(/\//g, '-');
}

export default function NotificationsTable({
	notificaciones,
}: NotificationsTableProps) {
	const [query, setQuery] = React.useState('');
	const [page, setPage] = React.useState(1);

	const filtered = React.useMemo(() => {
		const q = query.trim().toLowerCase();
		if (!q) return notificaciones;
		return notificaciones.filter((item) =>
			[item.message, item.action_label]
				.filter(Boolean)
				.some((value) => String(value).toLowerCase().includes(q)),
		);
	}, [notificaciones, query]);

	const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
	const currentPage = Math.min(page, totalPages);
	const rows = filtered.slice(
		(currentPage - 1) * PAGE_SIZE,
		currentPage * PAGE_SIZE,
	);

	React.useEffect(() => {
		setPage(1);
	}, [query]);

	return (
		<div className="space-y-4">
			<Input
				placeholder="Buscar notificación..."
				value={query}
				onChange={(event) => setQuery(event.target.value)}
				className="max-w-sm"
			/>

			<div className="overflow-hidden rounded-md border bg-white dark:bg-[#28314c]">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Número</TableHead>
							<TableHead>Mensaje</TableHead>
							<TableHead>Acción</TableHead>
							<TableHead>Fecha</TableHead>
							<TableHead>Marcado como leído</TableHead>
							<TableHead>Botones</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{rows.length ? (
							rows.map((user, index) => {
								const number = (currentPage - 1) * PAGE_SIZE + index + 1;
								const isRead = user.read_at != null;
								return (
									<TableRow key={user.id}>
										<TableCell>#{number}</TableCell>
										<TableCell className="max-w-80">
											{user.title && (
												<div className="truncate font-medium">{user.title}</div>
											)}
											{/* message viene sanitizado desde el servidor */}
											<div
												className="text-muted-foreground line-clamp-2 [&_a]:underline"
												dangerouslySetInnerHTML={{ __html: user.message ?? '' }}
											/>
										</TableCell>
										<TableCell>
											<a
												className={cn(buttonVariants({ variant: 'outline' }))}
												href={user.action_url ?? '#'}
												target="_blank"
												rel="noreferrer"
											>
												{user.action_label ?? 'Abrir'}
											</a>
										</TableCell>
										<TableCell>{formatDate(user.created_at)}</TableCell>
										<TableCell>
											<Badge variant={isRead ? 'susess' : 'warning'}>
												{isRead ? 'Leído' : 'No leído'}
											</Badge>
										</TableCell>
										<TableCell>
											<DropdownMenu>
												<DropdownMenuTrigger
													render={<Button variant="outline" size="sm" />}
												>
													Acciones
												</DropdownMenuTrigger>
												<DropdownMenuContent align="end" className="w-44">
													{isRead ? (
														<DropdownMenuItem>Ya leída</DropdownMenuItem>
													) : (
														<DropdownMenuItem>
															<form
																action="/api/notifications/update"
																method="post"
															>
																<input
																	type="hidden"
																	value="true"
																	name="estado_lectura"
																/>
																<input
																	type="hidden"
																	value={user.id}
																	name="id"
																/>
																<button
																	type="submit"
																	className="cursor-pointer"
																>
																	Marcar como leído
																</button>
															</form>
														</DropdownMenuItem>
													)}
													<DropdownMenuItem
														data-modal-target="edit-user-modal"
														data-modal-toggle="edit-user-modal"
														data-edit-user
														data-user-id={number}
														data-user-userid={user.user_id}
														data-mensaje={user.message || ''}
														data-read-at={user.read_at || ''}
														data-creado={user.created_at || ''}
														data-action-url={user.action_url || ''}
														data-action-label={user.action_label || ''}
													>
														Ver notificación
													</DropdownMenuItem>
												</DropdownMenuContent>
											</DropdownMenu>
										</TableCell>
									</TableRow>
								);
							})
						) : (
							<TableRow>
								<TableCell colSpan={6} className="h-16 text-center">
									No hay notificaciones aún.
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</div>

			<div className="flex items-center justify-end gap-2">
				<Button
					variant="outline"
					size="sm"
					onClick={() => setPage((value) => Math.max(1, value - 1))}
					disabled={currentPage === 1}
				>
					Anterior
				</Button>
				<Button
					variant="outline"
					size="sm"
					onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
					disabled={currentPage >= totalPages}
				>
					Siguiente
				</Button>
			</div>
		</div>
	);
}
