import type { ColumnDef } from '@tanstack/react-table';
import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from '@components/components/ui/avatar';
import { Badge } from '@components/components/ui/badge';
import { Button } from '@components/components/ui/button';
import { Checkbox } from '@components/components/ui/checkbox';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@components/components/ui/dropdown-menu';

export interface UserTableRow {
	user_id: string;
	nombre: string;
	apellido: string;
	correo: string;
	avatarUrl: string | null;
	organizacion: string;
	cargo: string;
	name: string;
	estado: string;
	rolesNombres: string[];
	rolesIds: string[];
	ciudad: string;
	direccionLinea1: string;
	direccionLinea2: string;
	telefono: string;
	fechaNacimiento: string;
	tipoIdentificacion: string;
	numeroIdentificacion: string;
	tipoPersona: string;
	pais_id: string;
}

interface CreateUsersColumnsProps {
	onEditUser: (user: UserTableRow) => void;
	onUpdateEstado: (user: UserTableRow) => void;
}

const roleVariant = (role: string) => {
	if (role === 'admin') return 'danger';
	if (role === 'cliente') return 'standar';
	return 'alternative';
};

export const createUsersColumns = ({
	onEditUser,
	onUpdateEstado,
}: CreateUsersColumnsProps): ColumnDef<UserTableRow>[] => [
	{
		id: 'select',
		enableSorting: false,
		enableHiding: false,
		header: ({ table }) => (
			<Checkbox
				checked={table.getIsAllPageRowsSelected()}
				onCheckedChange={(value) =>
					table.toggleAllPageRowsSelected(Boolean(value))
				}
				aria-label="Seleccionar pagina"
			/>
		),
		cell: ({ row }) => (
			<Checkbox
				checked={row.getIsSelected()}
				onCheckedChange={(value) => row.toggleSelected(Boolean(value))}
				aria-label="Seleccionar usuario"
			/>
		),
	},
	{
		accessorKey: 'nombre',
		header: ({ column }) => (
			<Button
				variant="ghost"
				onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
			>
				Nombre
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="24"
					height="24"
					viewBox="0 0 24 24"
				>
					<path
						fill="currentColor"
						d="m11.95 7.95l-1.414 1.414L8 6.828V20H6V6.828L3.466 9.364L2.05 7.95L7 3zm10 8.1L17 21l-4.95-4.95l1.414-1.414l2.537 2.536L16 4h2v13.172l2.536-2.536z"
					/>
				</svg>
			</Button>
		),
		cell: ({ row }) => {
			const user = row.original;
			const initials =
				`${user.nombre?.[0] ?? ''}${user.apellido?.[0] ?? ''}`.toUpperCase();
			const avatarSrc =
				user.avatarUrl && user.avatarUrl !== 'NULL'
					? user.avatarUrl
					: `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(user.nombre)}`;

			return (
				<div className="flex items-center gap-3">
					<Avatar size="sm">
						<AvatarImage src={avatarSrc} alt={`Avatar de ${user.nombre}`} />
						<AvatarFallback>{initials || 'U'}</AvatarFallback>
					</Avatar>
					<div className="flex flex-col gap-0.5">
						<p className="text-sm font-medium">
							{`${user.nombre} ${user.apellido}`.trim()}
						</p>
						<p className="text-muted-foreground text-xs">{user.correo}</p>
					</div>
				</div>
			);
		},
	},
	{
		accessorKey: 'organizacion',
		header: 'Compañía',
		cell: ({ row }) => (
			<span className="text-muted-foreground max-w-52 truncate text-sm">
				{row.original.organizacion || 'Sin compañía'}
			</span>
		),
	},
	{
		accessorKey: 'cargo',
		header: 'Cargo',
		cell: ({ row }) => <span>{row.original.cargo || 'Sin cargo'}</span>,
	},
	{
		accessorKey: 'paisNombre',
		header: 'País',
		cell: ({ row }) => <span>{row.original.name || '—'}</span>,
	},
	{
		accessorKey: 'estado',
		header: 'Estado',
		cell: ({ row }) => {
			const isActive = row.original.estado === 'activo';
			return (
				<Badge variant={isActive ? 'susess' : 'warning'}>
					{row.original.estado || 'desconocido'}
				</Badge>
			);
		},
	},
	{
		accessorKey: 'rolesNombres',
		header: 'Roles',
		cell: ({ row }) => (
			<div className="flex flex-wrap gap-1">
				{row.original.rolesNombres.length === 0 ? (
					<Badge variant="outline">Sin rol</Badge>
				) : (
					row.original.rolesNombres.map((role) => (
						<Badge
							key={`${row.original.user_id}-${role}`}
							variant={roleVariant(role)}
						>
							{role}
						</Badge>
					))
				)}
			</div>
		),
	},
	{
		id: 'actions',
		header: 'Acciones',
		cell: ({ row }) => {
			const user = row.original;

			return (
				<DropdownMenu>
					<DropdownMenuTrigger
						render={
							<Button
								variant="ghost"
								size="icon-sm"
								aria-label="Abrir acciones"
							/>
						}
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="24"
							height="24"
							viewBox="0 0 24 24"
						>
							<path
								fill="currentColor"
								d="M5 10c-1.1 0-2 .9-2 2s.9 2 2 2s2-.9 2-2s-.9-2-2-2m14 0c-1.1 0-2 .9-2 2s.9 2 2 2s2-.9 2-2s-.9-2-2-2m-7 0c-1.1 0-2 .9-2 2s.9 2 2 2s2-.9 2-2s-.9-2-2-2"
							/>
						</svg>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end" className="w-44">
						<DropdownMenuGroup>
							<DropdownMenuItem onClick={() => onEditUser(user)}>
								Editar usuario
							</DropdownMenuItem>
							<DropdownMenuItem onClick={() => onUpdateEstado(user)}>
								Actualizar estado
							</DropdownMenuItem>
						</DropdownMenuGroup>
						<DropdownMenuSeparator />
						<DropdownMenuGroup>
							<DropdownMenuItem
								variant="destructive"
								onClick={() => onUpdateEstado(user)}
							>
								Archivar
							</DropdownMenuItem>
						</DropdownMenuGroup>
					</DropdownMenuContent>
				</DropdownMenu>
			);
		},
	},
];
