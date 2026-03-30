import * as React from 'react';
import type {
	ColumnFiltersState,
	RowSelectionState,
	SortingState,
	VisibilityState,
} from '@tanstack/react-table';
import {
	flexRender,
	getCoreRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	useReactTable,
} from '@tanstack/react-table';
import { Button } from '@components/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@components/components/ui/dialog';
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuLabel,
	DropdownMenuTrigger,
} from '@components/components/ui/dropdown-menu';
import { Field, FieldGroup, FieldLabel } from '@components/components/ui/field';
import { Input } from '@components/components/ui/input';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@components/components/ui/table';
import type {
	PaisItem,
	RolItem,
	UserRoleItem,
	UsuarioItem,
} from '@modules/users/types';
import { createUsersColumns, type UserTableRow } from './users-columns';
import { Checkbox } from '@components/components/ui/checkbox';
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@components/components/ui/select';
import PhoneInputField from './PhoneInputField';
import { BirthDatePicker } from '@components/forms/BirthDatePicker';
import { Spinner } from '@components/components/ui/spinner';

interface UsersCrudTableProps {
	usuarios: UsuarioItem[];
	roles: RolItem[];
	paises: PaisItem[];
	rolesGeneral: UserRoleItem[];
}

const BACK_PATH = '/usuarios/';

const mapUsersToRows = (
	usuarios: UsuarioItem[],
	rolesGeneral: UserRoleItem[],
): UserTableRow[] => {
	const rolesByUserId = rolesGeneral.reduce<Map<string, UserRoleItem[]>>(
		(acc, item) => {
			const current = acc.get(item.user_id) ?? [];
			current.push(item);
			acc.set(item.user_id, current);
			return acc;
		},
		new Map(),
	);

	return usuarios.map((user) => {
		const userRoles = rolesByUserId.get(user.user_id) ?? [];
		return {
			user_id: user.user_id,
			nombre: user.nombre ?? '',
			apellido: user.apellido ?? '',
			correo: user.correo ?? '',
			avatarUrl: user.avatar_url ?? null,
			organizacion: user.organizacion ?? '',
			cargo: user.cargo ?? '',
			paisNombre: user.paises?.name ?? '—',
			estado: user.estado ?? 'inactivo',
			rolesNombres: userRoles
				.map((role) => role.roles?.name?.trim())
				.filter((role): role is string => Boolean(role)),
			rolesIds: userRoles.map((role) => String(role.rol_id)),
			ciudad: user.ciudad ?? '',
			direccionLinea1: user.direccion_linea1 ?? '',
			direccionLinea2: user.direccion_linea2 ?? '',
			telefono: user.telf ?? '',
			fechaNacimiento: user.fecha_nacimiento ?? '',
			tipoIdentificacion: user.tipo_identificacion ?? '',
			numeroIdentificacion: user.numero_de_identificacion ?? '',
			tipoPersona: user.tipo_persona ?? '',
			paisId: user.pais_id ? String(user.pais_id) : '',
		};
	});
};

export default function UsersCrudTable({
	usuarios,
	roles,
	paises,
	rolesGeneral,
}: UsersCrudTableProps) {
	const data = React.useMemo(
		() => mapUsersToRows(usuarios, rolesGeneral),
		[usuarios, rolesGeneral],
	);

	const paisOptions = React.useMemo(
		() =>
			paises.map((pais) => ({
				value: String(pais.id),
				label: pais.name,
			})),
		[paises],
	);

	const [sorting, setSorting] = React.useState<SortingState>([]);
	const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
		[],
	);
	const [columnVisibility, setColumnVisibility] =
		React.useState<VisibilityState>({});
	const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});

	const [inviteOpen, setInviteOpen] = React.useState(false);
	const [createRoleOpen, setCreateRoleOpen] = React.useState(false);
	const [editOpen, setEditOpen] = React.useState(false);
	const [estadoOpen, setEstadoOpen] = React.useState(false);
	const [activeUser, setActiveUser] = React.useState<UserTableRow | null>(null);
	const [isSavingUpdate, setIsSavingUpdate] = React.useState(false);

	const columns = React.useMemo(
		() =>
			createUsersColumns({
				onEditUser: (user) => {
					setActiveUser(user);
					setEditOpen(true);
				},
				onUpdateEstado: (user) => {
					setActiveUser(user);
					setEstadoOpen(true);
				},
			}),
		[],
	);

	const table = useReactTable({
		data,
		columns,
		onSortingChange: setSorting,
		onColumnFiltersChange: setColumnFilters,
		onColumnVisibilityChange: setColumnVisibility,
		onRowSelectionChange: setRowSelection,
		getCoreRowModel: getCoreRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		state: {
			sorting,
			columnFilters,
			columnVisibility,
			rowSelection,
		},
	});

	return (
		<section className="space-y-4 p-4 lg:p-6">
			<div className="p-4 shadow-xs">
				<div className="flex flex-col gap-4">
					<div className="flex flex-wrap items-center justify-between gap-3">
						<div className="space-y-1">
							<p className="text-muted-foreground text-sm">Usuarios</p>
							<h1 className="text-xl font-semibold">Todos los usuarios</h1>
						</div>
						<div className="flex flex-wrap items-center gap-2">
							<Button onClick={() => setInviteOpen(true)} variant="primary">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="24"
									height="24"
									viewBox="0 0 24 24"
								>
									<path
										fill="currentColor"
										d="M11 11V5h2v6h6v2h-6v6h-2v-6H5v-2z"
									/>
								</svg>
								Invitar usuario
							</Button>
							<Button variant="outline" onClick={() => setCreateRoleOpen(true)}>
								Añadir rol
							</Button>
						</div>
					</div>

					<div className="flex flex-wrap items-center gap-2">
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
									(table.getColumn('nombre')?.getFilterValue() as string) ?? ''
								}
								onChange={(event) =>
									table.getColumn('nombre')?.setFilterValue(event.target.value)
								}
								className="dark:bg-black-700 w-full bg-white pl-9"
							/>
						</div>
						<DropdownMenu>
							<DropdownMenuTrigger
								render={<Button variant="outline" className="ml-auto" />}
							>
								Columnas
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
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end" className="w-44">
								<DropdownMenuGroup>
									<DropdownMenuLabel>Visibilidad</DropdownMenuLabel>
									{table
										.getAllColumns()
										.filter((column) => column.getCanHide())
										.map((column) => (
											<DropdownMenuCheckboxItem
												key={column.id}
												checked={column.getIsVisible()}
												onCheckedChange={(value) =>
													column.toggleVisibility(Boolean(value))
												}
											>
												{column.id}
											</DropdownMenuCheckboxItem>
										))}
								</DropdownMenuGroup>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>

					<div className="dark:bg-black-800 overflow-hidden rounded-md border bg-white">
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
											className="h-20 text-center"
										>
											No hay usuarios.
										</TableCell>
									</TableRow>
								)}
							</TableBody>
						</Table>
					</div>

					<div className="flex items-center justify-between gap-2">
						<p className="text-muted-foreground text-sm">
							{table.getFilteredRowModel().rows.length} resultado(s) ·{' '}
							{table.getSelectedRowModel().rows.length} seleccionado(s)
						</p>
						<div className="flex items-center gap-2">
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
				</div>
			</div>

			<Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Invitar usuario</DialogTitle>
						<DialogDescription>
							Ingresa el correo para enviar una invitación.
						</DialogDescription>
					</DialogHeader>
					<form
						action={`/api/update/admin-invite?back=${encodeURIComponent(BACK_PATH)}`}
						method="post"
						className="space-y-4"
					>
						<FieldGroup>
							<Field>
								<FieldLabel htmlFor="correo_create">Correo</FieldLabel>
								<Input
									id="correo_create"
									name="correo_create"
									type="email"
									placeholder="correo@ejemplo.com"
									required
								/>
							</Field>
						</FieldGroup>
						<DialogFooter>
							<Button
								type="button"
								variant="second"
								onClick={() => setInviteOpen(false)}
							>
								Cancelar
							</Button>
							<Button type="submit" variant="primary">
								Enviar invitación
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>

			<Dialog open={createRoleOpen} onOpenChange={setCreateRoleOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Añadir rol</DialogTitle>
						<DialogDescription>
							Crea un rol disponible para asignar a usuarios.
						</DialogDescription>
					</DialogHeader>
					<form
						action={`/api/create/admin-new-rol?back=${encodeURIComponent(BACK_PATH)}`}
						method="post"
						className="space-y-4"
					>
						<FieldGroup>
							<Field>
								<FieldLabel htmlFor="nombre_rol">Nombre del rol</FieldLabel>
								<Input
									id="nombre_rol"
									name="nombre_rol"
									type="text"
									placeholder="admin"
									required
								/>
							</Field>
						</FieldGroup>
						<DialogFooter>
							<Button
								type="button"
								variant="second"
								onClick={() => setCreateRoleOpen(false)}
							>
								Cancelar
							</Button>
							<Button type="submit" variant="primary">
								Guardar rol
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>

			<Dialog open={editOpen} onOpenChange={setEditOpen}>
				<DialogContent className="max-w-4xl">
					<DialogHeader>
						<DialogTitle>Editar usuario</DialogTitle>
						<DialogDescription>
							Actualiza información general, dirección y roles.
						</DialogDescription>
					</DialogHeader>
					<form
						key={activeUser?.user_id ?? 'edit-form'}
						action={`/api/update/admin-update?back=${encodeURIComponent(BACK_PATH)}`}
						method="post"
						className="space-y-5"
						onSubmit={() => setIsSavingUpdate(true)}
					>
						<input
							type="hidden"
							name="user_id"
							value={activeUser?.user_id ?? ''}
						/>
						<FieldGroup className="grid gap-4 md:grid-cols-2">
							<Field>
								<FieldLabel htmlFor="nombre">Nombre</FieldLabel>
								<Input
									id="nombre"
									name="nombre"
									defaultValue={activeUser?.nombre ?? ''}
								/>
							</Field>
							<Field>
								<FieldLabel htmlFor="apellido">Apellido</FieldLabel>
								<Input
									id="apellido"
									name="apellido"
									defaultValue={activeUser?.apellido ?? ''}
								/>
							</Field>
							<Field>
								<FieldLabel htmlFor="correo">Correo</FieldLabel>
								<Input
									id="correo"
									name="correo"
									type="email"
									defaultValue={activeUser?.correo ?? ''}
								/>
							</Field>
							<Field>
								<FieldLabel htmlFor="compania">Compañía</FieldLabel>
								<Input
									id="compania"
									name="compania"
									defaultValue={activeUser?.organizacion ?? ''}
								/>
							</Field>
							<Field>
								<FieldLabel htmlFor="pais_modal">Pais</FieldLabel>
								<Select
									name="pais_modal"
									defaultValue={activeUser?.paisId ?? ''}
									items={paisOptions}
								>
									<SelectTrigger id="pais_modal" className="w-full">
										<SelectValue placeholder="Selecciona un pais" />
									</SelectTrigger>
									<SelectContent>
										<SelectGroup>
											{paisOptions.map((pais) => (
												<SelectItem key={pais.value} value={pais.value}>
													{pais.label}
												</SelectItem>
											))}
										</SelectGroup>
									</SelectContent>
								</Select>
							</Field>
							<Field>
								<FieldLabel htmlFor="ciudad_modal">Ciudad</FieldLabel>
								<Input
									id="ciudad_modal"
									name="ciudad_modal"
									defaultValue={activeUser?.ciudad ?? ''}
								/>
							</Field>
							<Field>
								<FieldLabel htmlFor="direccion_linea1">
									Dirección linea 1
								</FieldLabel>
								<Input
									id="direccion_linea1"
									name="direccion_linea1"
									defaultValue={activeUser?.direccionLinea1 ?? ''}
								/>
							</Field>
							<Field>
								<FieldLabel htmlFor="direccion_linea2">
									Dirección linea 2
								</FieldLabel>
								<Input
									id="direccion_linea2"
									name="direccion_linea2"
									defaultValue={activeUser?.direccionLinea2 ?? ''}
								/>
							</Field>
							<Field>
								<FieldLabel htmlFor="modal_telefono">Teléfono</FieldLabel>
								<PhoneInputField
									id="modal_telefono"
									name="modal_telefono"
									defaultValue={activeUser?.telefono ?? ''}
								/>
							</Field>
							<Field>
								<FieldLabel htmlFor="fecha_nacimiento">
									Fecha nacimiento
								</FieldLabel>
								<BirthDatePicker
									id="fecha_nacimiento"
									name="fecha_nacimiento"
									defaultValue={activeUser?.fechaNacimiento ?? ''}
								/>
							</Field>
							<Field>
								<FieldLabel htmlFor="tipo_identificacion">
									Tipo identificación
								</FieldLabel>
								<Select>
									<SelectTrigger id="tipo_identificacion" className="w-full">
										<SelectValue placeholder="Selecciona un tipo de documento" />
									</SelectTrigger>
									<SelectContent>
										<SelectGroup>
											<SelectItem value="Cédula">Cedula</SelectItem>
											<SelectItem value="RUC">RUC</SelectItem>
											<SelectItem value="ID">ID</SelectItem>
											<SelectItem value="Pasaporte">Pasaporte</SelectItem>
											<SelectItem value="EIN">EIN</SelectItem>
										</SelectGroup>
									</SelectContent>
								</Select>
							</Field>
							<Field>
								<FieldLabel htmlFor="numero_de_identificacion">
									Numero identificación
								</FieldLabel>
								<Input
									id="numero_de_identificacion"
									name="numero_de_identificacion"
									defaultValue={activeUser?.numeroIdentificacion ?? ''}
								/>
							</Field>
							<Field>
								<FieldLabel htmlFor="tipo_persona">Tipo persona</FieldLabel>
								<Select>
									<SelectTrigger id="tipo_persona" className="w-full">
										<SelectValue placeholder="Selecciona un tipo de persona" />
									</SelectTrigger>
									<SelectContent>
										<SelectGroup>
											<SelectItem value="Natural">Natural</SelectItem>
											<SelectItem value="Jurídica">Jurídica</SelectItem>
										</SelectGroup>
									</SelectContent>
								</Select>
							</Field>
						</FieldGroup>

						<div className="space-y-2">
							<p className="text-sm font-medium">Roles</p>
							<div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
								{roles.map((rol) => (
									<label
										key={String(rol.id)}
										className="border-white-300 dark:border-black-600 flex items-center gap-2 rounded-lg border p-2 text-sm"
									>
										<Checkbox
											name="roles[]"
											value={String(rol.id)}
											defaultChecked={
												activeUser?.rolesIds.includes(String(rol.id)) ?? false
											}
											className="size-4"
										/>
										<span>{rol.name}</span>
									</label>
								))}
							</div>
						</div>

						<DialogFooter>
							<Button
								type="button"
								variant="outline"
								className="border-white-300 hover:border-white-200 dark:border-black-600 dark:hover:border-black-500 cursor-pointer border"
								onClick={() => setEditOpen(false)}
							>
								Cancelar
							</Button>
							<Button type="submit" disabled={isSavingUpdate}>
								{isSavingUpdate && <Spinner data-icon="inline-start" />}
								{isSavingUpdate ? 'Guardando cambios...' : 'Guardar cambios'}
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>

			<Dialog open={estadoOpen} onOpenChange={setEstadoOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Actualizar estado</DialogTitle>
						<DialogDescription>
							Selecciona el estado para {activeUser?.nombre ?? 'el usuario'}.
						</DialogDescription>
					</DialogHeader>
					<form
						action={`/api/update/admin-update?back=${encodeURIComponent(BACK_PATH)}`}
						method="post"
						className="space-y-4"
						onSubmit={() => setIsSavingUpdate(true)}
					>
						<input
							type="hidden"
							name="user_id"
							value={activeUser?.user_id ?? ''}
						/>
						<Field>
							<FieldLabel htmlFor="estado">Estado</FieldLabel>
							<Select
								id="estado"
								name="estado"
								defaultValue={activeUser?.estado ?? 'activo'}
							>
								<SelectTrigger>
									<SelectValue placeholder="Selecciona un estado" />
								</SelectTrigger>
								<SelectContent>
									<SelectGroup>
										<SelectItem value="activo">activo</SelectItem>
										<SelectItem value="inactivo">inactivo</SelectItem>
									</SelectGroup>
								</SelectContent>
							</Select>
						</Field>
						<DialogFooter>
							<Button
								type="button"
								variant="second"
								onClick={() => setEstadoOpen(false)}
							>
								Cancelar
							</Button>
							<Button type="submit" disabled={isSavingUpdate}>
								{isSavingUpdate && <Spinner data-icon="inline-start" />}
								{isSavingUpdate ? 'Guardando cambios...' : 'Guardar cambios'}
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>
		</section>
	);
}
