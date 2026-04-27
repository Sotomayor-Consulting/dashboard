import * as React from 'react';
import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from '@components/components/ui/avatar';
import { Badge } from '@components/components/ui/badge';
import { Button } from '@components/components/ui/button';
import { Input } from '@components/components/ui/input';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@components/components/ui/table';

interface MailingUser {
	user_id: string;
	nombre?: string | null;
	apellido?: string | null;
	correo?: string | null;
	avatar_url?: string | null;
	organizacion?: string | null;
	cargo?: string | null;
	estado?: string | null;
	pais?: Array<{ nombre_paises?: string | null }>;
	usuarios_empresas?: Array<{ rol_en_empresa?: string | null }>;
}

interface CrudMailingTableProps {
	usuarios: MailingUser[];
}

const PAGE_SIZE = 10;

export default function CrudMailingTable({ usuarios }: CrudMailingTableProps) {
	const [query, setQuery] = React.useState('');
	const [page, setPage] = React.useState(1);

	const filtered = React.useMemo(() => {
		const q = query.trim().toLowerCase();
		if (!q) return usuarios;
		return usuarios.filter((user) =>
			[
				`${user.nombre ?? ''} ${user.apellido ?? ''}`,
				user.correo,
				user.organizacion,
			]
				.filter(Boolean)
				.some((value) => String(value).toLowerCase().includes(q)),
		);
	}, [usuarios, query]);

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
				placeholder="Buscar usuario..."
				value={query}
				onChange={(event) => setQuery(event.target.value)}
				className="max-w-sm"
			/>

			<div className="overflow-hidden rounded-md border bg-white dark:bg-[#28314c]">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Nombre</TableHead>
							<TableHead>Compañía</TableHead>
							<TableHead>Cargo</TableHead>
							<TableHead>País</TableHead>
							<TableHead>Estado</TableHead>
							<TableHead>Rol</TableHead>
							<TableHead>Acciones</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{rows.length ? (
							rows.map((user) => {
								const fullName =
									`${user.nombre ?? ''} ${user.apellido ?? ''}`.trim();
								const initials = fullName
									.split(' ')
									.filter(Boolean)
									.slice(0, 2)
									.map((part) => part[0])
									.join('')
									.toUpperCase();
								const avatar =
									user.avatar_url && user.avatar_url !== 'NULL'
										? user.avatar_url
										: `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(fullName || user.user_id)}`;

								return (
									<TableRow key={user.user_id}>
										<TableCell>
											<div className="flex items-center gap-3">
												<Avatar size="sm">
													<AvatarImage src={avatar} alt={fullName} />
													<AvatarFallback>{initials || 'U'}</AvatarFallback>
												</Avatar>
												<div className="flex flex-col">
													<span>{fullName || 'Sin nombre'}</span>
													<span className="text-muted-foreground text-xs">
														{user.correo ?? '—'}
													</span>
												</div>
											</div>
										</TableCell>
										<TableCell>{user.organizacion ?? '—'}</TableCell>
										<TableCell>{user.cargo ?? '—'}</TableCell>
										<TableCell>
											{user.pais?.[0]?.nombre_paises ?? '—'}
										</TableCell>
										<TableCell>
											<Badge
												variant={
													user.estado === 'activo' ? 'susess' : 'warning'
												}
											>
												{user.estado ?? 'inactivo'}
											</Badge>
										</TableCell>
										<TableCell>
											{user.usuarios_empresas?.[0]?.rol_en_empresa ?? '—'}
										</TableCell>
										<TableCell>
											<div className="flex flex-wrap gap-2">
												<Button
													type="button"
													variant="outline"
													size="sm"
													data-modal-target="top-right-modal"
													data-modal-toggle="top-right-modal"
													data-user-mail={user.correo ?? ''}
												>
													Enviar correo
												</Button>
												<Button
													type="button"
													variant="outline"
													size="sm"
													data-open-estado
													data-user-id={user.user_id}
													data-user-estado={user.estado || ''}
													data-user-name={fullName}
													data-modal-target="updaterol"
													data-modal-toggle="updaterol"
												>
													Archivar
												</Button>
											</div>
										</TableCell>
									</TableRow>
								);
							})
						) : (
							<TableRow>
								<TableCell colSpan={7} className="h-16 text-center">
									No hay usuarios
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
