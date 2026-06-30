import * as React from 'react';
import type {
	ColumnDef,
	ColumnFiltersState,
	SortingState,
} from '@tanstack/react-table';
import {
	flexRender,
	getCoreRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	useReactTable,
} from '@tanstack/react-table';
import { getAvatarUrl } from '@shared/avatar';
import { Avatar, AvatarFallback, AvatarImage } from '@components/ui/Avatar';
import { Badge } from '@components/ui/Badge';
import { Button } from '@components/ui/Button';
import { Input } from '@components/ui/Input';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@components/ui/Table';

interface UserItem {
	user_id: string;
	nombre?: string | null;
	apellido?: string | null;
	correo?: string | null;
	avatar_url?: string | null;
	estado?: string | null;
	countries?: {
		name?: string | null;
	};
}

interface RoleItem {
	user_id: string;
	roles: {
		name: string;
	};
}

interface TableRow {
	user_id: string;
	nombreCompleto: string;
	correo: string;
	avatarUrl: string | null;
	pais: string;
	estado: string;
	roles: string[];
}

interface UserNotificationsTableProps {
	usuarios: UserItem[];
	roles: RoleItem[];
}

const roleVariant = (role: string) => {
	if (role === 'admin') return 'danger';
	if (role === 'cliente') return 'susess';
	return 'warning';
};

function mapRows(usuarios: UserItem[], roles: RoleItem[]): TableRow[] {
	const rolesMap = roles.reduce<Map<string, string[]>>((acc, role) => {
		const current = acc.get(role.user_id) ?? [];
		current.push(role.roles.name);
		acc.set(role.user_id, current);
		return acc;
	}, new Map());

	return usuarios.map((user) => ({
		user_id: user.user_id,
		nombreCompleto:
			`${user.nombre ?? ''} ${user.apellido ?? ''}`.trim() || 'Sin nombre',
		correo: user.correo ?? '—',
		avatarUrl: user.avatar_url ?? null,
		pais: user.countries?.name ?? '—',
		estado: user.estado ?? 'inactivo',
		roles: rolesMap.get(user.user_id) ?? [],
	}));
}

export default function UserNotificationsTable({
	usuarios,
	roles,
}: UserNotificationsTableProps) {
	const data = React.useMemo(() => mapRows(usuarios, roles), [usuarios, roles]);
	const [sorting, setSorting] = React.useState<SortingState>([]);
	const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
		[],
	);

	const columns = React.useMemo<ColumnDef<TableRow>[]>(
		() => [
			{
				accessorKey: 'nombreCompleto',
				header: 'Nombre',
				cell: ({ row }) => {
					const user = row.original;
					const initials = user.nombreCompleto
						.split(' ')
						.filter(Boolean)
						.slice(0, 2)
						.map((part) => part[0])
						.join('')
						.toUpperCase();
					const avatar =
						getAvatarUrl(user.avatarUrl) ??
						`https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(user.nombreCompleto)}`;

					return (
						<div className="flex items-center gap-3">
							<Avatar size="sm">
								<AvatarImage src={avatar} alt={user.nombreCompleto} />
								<AvatarFallback>{initials || 'U'}</AvatarFallback>
							</Avatar>
							<div className="flex flex-col">
								<span className="text-sm font-medium">
									{user.nombreCompleto}
								</span>
								<span className="text-muted-foreground text-xs">
									{user.correo}
								</span>
							</div>
						</div>
					);
				},
			},
			{
				accessorKey: 'pais',
				header: 'País',
			},
			{
				accessorKey: 'estado',
				header: 'Estado',
				cell: ({ row }) => {
					const active = row.original.estado === 'activo';
					return (
						<Badge variant={active ? 'susess' : 'warning'}>
							{row.original.estado}
						</Badge>
					);
				},
			},
			{
				accessorKey: 'roles',
				header: 'Rol',
				cell: ({ row }) => (
					<div className="flex flex-wrap gap-1">
						{row.original.roles.length ? (
							row.original.roles.map((role) => (
								<Badge
									key={`${row.original.user_id}-${role}`}
									variant={roleVariant(role)}
								>
									{role}
								</Badge>
							))
						) : (
							<Badge variant="outline">Sin rol</Badge>
						)}
					</div>
				),
			},
			{
				id: 'actions',
				header: 'Acciones',
				cell: ({ row }) => (
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={() => {
							const input = document.querySelector<HTMLInputElement>(
								'input[name="user_id_modal_name"]',
							);
							if (input) input.value = row.original.user_id;

							document.dispatchEvent(
								new CustomEvent('open-notification-modal', {
									detail: {
										userId: row.original.user_id,
										userName: row.original.nombreCompleto,
										email: row.original.correo,
									},
								}),
							);
						}}
					>
						Enviar notificación
					</Button>
				),
			},
		],
		[],
	);

	const table = useReactTable({
		data,
		columns,
		onSortingChange: setSorting,
		onColumnFiltersChange: setColumnFilters,
		getCoreRowModel: getCoreRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		state: {
			sorting,
			columnFilters,
		},
	});

	return (
		<div className="space-y-4 px-4">
			<div className="relative w-full max-w-sm">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="16"
					height="16"
					viewBox="0 0 24 24"
					className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"
				>
					<path
						fill="currentColor"
						d="M11 2c4.968 0 9 4.032 9 9s-4.032 9-9 9s-9-4.032-9-9s4.032-9 9-9m0 16c3.867 0 7-3.133 7-7s-3.133-7-7-7s-7 3.133-7 7s3.133 7 7 7m8.485.071l2.829 2.828l-1.415 1.415l-2.828-2.829z"
					/>
				</svg>
				<Input
					placeholder="Buscar por nombre..."
					value={
						(table.getColumn('nombreCompleto')?.getFilterValue() as string) ??
						''
					}
					onChange={(event) =>
						table
							.getColumn('nombreCompleto')
							?.setFilterValue(event.target.value)
					}
					className="w-full pl-9"
				/>
			</div>

			<div className="overflow-hidden rounded-md border bg-white dark:bg-neutral-900">
				<Table>
					<TableHeader>
						{table.getHeaderGroups().map((headerGroup) => (
							<TableRow key={headerGroup.id}>
								{headerGroup.headers.map((header) => (
									<TableHead key={header.id}>
										{header.isPlaceholder
											? null
											: flexRender(
													header.column.columnDef.header,
													header.getContext(),
												)}
									</TableHead>
								))}
							</TableRow>
						))}
					</TableHeader>
					<TableBody>
						{table.getRowModel().rows.length ? (
							table.getRowModel().rows.map((row) => (
								<TableRow key={row.id}>
									{row.getVisibleCells().map((cell) => (
										<TableCell key={cell.id}>
											{flexRender(
												cell.column.columnDef.cell,
												cell.getContext(),
											)}
										</TableCell>
									))}
								</TableRow>
							))
						) : (
							<TableRow>
								<TableCell
									colSpan={columns.length}
									className="h-16 text-center"
								>
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
					onClick={() => table.previousPage()}
					disabled={!table.getCanPreviousPage()}
				>
					Anterior
				</Button>
				<Button
					variant="outline"
					size="sm"
					onClick={() => table.nextPage()}
					disabled={!table.getCanNextPage()}
				>
					Siguiente
				</Button>
			</div>
		</div>
	);
}
