import * as React from 'react';
import { Badge } from '@components/ui/badge';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@components/ui/dropdown-menu';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@components/ui/table';
import { buttonVariants } from '@components/ui/button';
import { cn } from '@components/lib/utils';

interface NotificationItem {
	id: string;
	user_id?: string;
	message?: string | null;
	link?: string | null;
	mensaje_link?: string | null;
	created_at?: string | null;
	is_read?: boolean | null;
	leido_en?: string | null;
}

interface NotificacionesTableProps {
	notificaciones: NotificationItem[];
}

const PAGE_SIZE = 10;

function formatDate(value?: string | null) {
	if (!value) return '—';
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return value;
	return date.toLocaleDateString('es-ES').replace(/\//g, '-');
}

export default function NotificacionesTable({
	notificaciones,
}: NotificacionesTableProps) {
	const [query, setQuery] = React.useState('');
	const [page, setPage] = React.useState(1);

	const filtered = React.useMemo(() => {
		const q = query.trim().toLowerCase();
		if (!q) return notificaciones;
		return notificaciones.filter((item) =>
			[item.message, item.mensaje_link]
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
								return (
									<TableRow key={user.id}>
										<TableCell>#{number}</TableCell>
										<TableCell className="max-w-80 truncate">
											{user.message}
										</TableCell>
										<TableCell>
											<a
												className={cn(buttonVariants({ variant: 'outline' }))}
												href={user.link ?? '#'}
												target="_blank"
												rel="noreferrer"
											>
												{user.mensaje_link ?? 'Abrir'}
											</a>
										</TableCell>
										<TableCell>{formatDate(user.created_at)}</TableCell>
										<TableCell>
											<Badge variant={user.is_read ? 'susess' : 'warning'}>
												{user.is_read ? 'Leído' : 'No leído'}
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
													{user.is_read ? (
														<DropdownMenuItem>Ya leída</DropdownMenuItem>
													) : (
														<DropdownMenuItem>
															<form
																action="/api/update/update-notification"
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
														data-isread={user.is_read || ''}
														data-fecha-leido={user.leido_en || ''}
														data-creado={user.created_at || ''}
														data-link={user.link || ''}
														data-mensajelink={user.mensaje_link || ''}
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
