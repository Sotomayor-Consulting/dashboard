import * as React from 'react';
import { Button } from '@components/ui/Button';
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@components/ui/Dialog';
import { Field, FieldGroup, FieldLabel } from '@components/ui/Field';
import { Input } from '@components/ui/Input';
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@components/ui/Select';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
	TableFooter,
} from '@components/ui/Table';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@components/ui/DropdownMenu';
import { ScrollArea, ScrollBar } from '@components/ui/ScrollArea';
import { EllipsisVerticalIcon, PencilIcon, Trash2Icon } from 'lucide-react';
import type { CompanyMemberItem, ManagerItem } from '../types';
import { useCompanyManagersCrud } from '../hooks/use-company-managers-crud';
import CrudFormSheet from './shared/CrudFormSheet';

interface Props {
	initialManagers: ManagerItem[];
	members: CompanyMemberItem[];
	companyId: string;
	canEditDetails: boolean;
}

export default function CompanyManagersCrudSection({
	initialManagers,
	members,
	companyId,
	canEditDetails,
}: Props) {
	const {
		managers,
		activeManager,
		draft,
		isCreateOpen,
		setIsCreateOpen,
		isEditOpen,
		setIsEditOpen,
		isDeleteOpen,
		setIsDeleteOpen,
		openCreate,
		openEdit,
		openDelete,
		updateDraft,
		hydrateFromMember,
		createManager,
		saveManager,
		removeManager,
	} = useCompanyManagersCrud(initialManagers, members, companyId);

	return (
		<section className="flex flex-col gap-4 border-gray-200 dark:border-gray-700">
			<header className="flex flex-col gap-1">
				<h3 className="text-lg font-semibold">Managers</h3>
				<p className="text-muted-foreground text-sm">
					Define quienes gestionan la LLC cuando la estructura es
					manager-managed.
				</p>
			</header>
			<div className="flex items-center justify-between">
				<h3 className="text-sm font-semibold">Listado de managers</h3>
				<Button
					type="button"
					variant="outline"
					onClick={openCreate}
					disabled={!canEditDetails}
				>
					Agregar manager
				</Button>
			</div>

			<ScrollArea className="w-full rounded-lg border border-gray-200 whitespace-nowrap dark:border-gray-700">
				<Table className="min-w-[900px]">
					<TableHeader>
						<TableRow>
							<TableHead>Nombre</TableHead>
							<TableHead>Correo</TableHead>
							<TableHead>Pais</TableHead>
							<TableHead>Residente fiscal EE.UU</TableHead>
							<TableHead className="text-right">Acciones</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{managers.map((manager) => (
							<TableRow key={manager.id}>
								<TableCell>{manager.Nombres_manager ?? '-'}</TableCell>
								<TableCell>
									{manager.Correo_electronico_manager ?? '-'}
								</TableCell>
								<TableCell>
									{manager.Pais_de_nacionalidad_manager ?? '-'}
								</TableCell>
								<TableCell>
									{manager.residente_fiscal_en_EE_UU_manager ? 'Si' : 'No'}
								</TableCell>
								<TableCell className="text-right">
									<DropdownMenu>
										<DropdownMenuTrigger
											render={
												<Button
													type="button"
													variant="outline"
													size="icon-sm"
													disabled={!canEditDetails}
													aria-label={`Acciones para ${manager.Nombres_manager ?? 'manager'}`}
												/>
											}
										>
											<EllipsisVerticalIcon />
										</DropdownMenuTrigger>
										<DropdownMenuContent
											align="end"
											className="w-auto min-w-36"
										>
											<DropdownMenuGroup>
												<DropdownMenuItem onClick={() => openEdit(manager)}>
													<PencilIcon />
													Editar
												</DropdownMenuItem>
												<DropdownMenuItem
													variant="destructive"
													onClick={() => openDelete(manager)}
												>
													<Trash2Icon />
													Eliminar
												</DropdownMenuItem>
											</DropdownMenuGroup>
										</DropdownMenuContent>
									</DropdownMenu>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
					<TableFooter>
						<TableRow>
							<TableCell colSpan={4} className="font-medium">
								Totales
							</TableCell>
							<TableCell className="text-right font-medium">
								{managers.length} managers
							</TableCell>
						</TableRow>
					</TableFooter>
				</Table>
				<ScrollBar orientation="horizontal" />
			</ScrollArea>

			<CrudFormSheet
				open={isCreateOpen}
				onOpenChange={setIsCreateOpen}
				title="Agregar manager"
				submitLabel="Agregar"
				onSubmit={createManager}
			>
				<ManagerForm
					draft={draft}
					members={members}
					updateDraft={updateDraft}
					hydrateFromMember={hydrateFromMember}
				/>
			</CrudFormSheet>

			<CrudFormSheet
				open={isEditOpen}
				onOpenChange={setIsEditOpen}
				title="Editar manager"
				submitLabel="Guardar"
				onSubmit={saveManager}
			>
				<ManagerForm
					draft={draft}
					members={members}
					updateDraft={updateDraft}
					hydrateFromMember={hydrateFromMember}
				/>
			</CrudFormSheet>

			<Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Eliminar manager</DialogTitle>
					</DialogHeader>
					<p className="text-muted-foreground text-sm">
						Se eliminara a {activeManager?.Nombres_manager ?? 'este manager'}{' '}
						del listado local.
					</p>
					<DialogFooter>
						<Button type="button" variant="destructive" onClick={removeManager}>
							Eliminar
						</Button>
						<Button
							type="button"
							variant="outline"
							onClick={() => setIsDeleteOpen(false)}
						>
							Cancelar
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</section>
	);
}

function ManagerForm({
	draft,
	members,
	updateDraft,
	hydrateFromMember,
}: {
	draft: any;
	members: CompanyMemberItem[];
	updateDraft: any;
	hydrateFromMember: (memberId: string) => void;
}) {
	const memberOptions = members.filter(
		(item) => item.full_name || item.email,
	);

	return (
		<div className="grid flex-1 auto-rows-min gap-6 px-4">
			<FieldGroup className="grid gap-4 md:grid-cols-2">
				<Field>
					<FieldLabel htmlFor="manager_source_type">Origen</FieldLabel>
					<Select
						value={draft.source_type}
						onValueChange={(value) => updateDraft('source_type')(value)}
					>
						<SelectTrigger id="manager_source_type" className="w-full">
							<SelectValue placeholder="Seleccione" />
						</SelectTrigger>
						<SelectContent>
							<SelectGroup>
								<SelectItem value="member">Socio existente</SelectItem>
								<SelectItem value="external">Manager externo</SelectItem>
							</SelectGroup>
						</SelectContent>
					</Select>
				</Field>

				{draft.source_type === 'member' && (
					<Field>
						<FieldLabel htmlFor="manager_member">Seleccionar socio</FieldLabel>
						<Select
							value={draft.member_id}
							onValueChange={(value) => {
								updateDraft('member_id')(value);
								hydrateFromMember(value);
							}}
						>
							<SelectTrigger id="manager_member" className="w-full">
								<SelectValue placeholder="Seleccione un socio" />
							</SelectTrigger>
							<SelectContent>
								<SelectGroup>
									{memberOptions.map((item) => (
										<SelectItem key={item.id} value={String(item.id)}>
											{item.full_name ?? 'Sin nombre'} - {item.email ?? '-'}
										</SelectItem>
									))}
								</SelectGroup>
							</SelectContent>
						</Select>
					</Field>
				)}

				<Field>
					<FieldLabel htmlFor="manager_nombre">Nombre</FieldLabel>
					<Input
						id="manager_nombre"
						value={draft.Nombres_manager ?? ''}
						onChange={(e) => updateDraft('Nombres_manager')(e.target.value)}
					/>
				</Field>
				<Field>
					<FieldLabel htmlFor="manager_correo">Correo</FieldLabel>
					<Input
						id="manager_correo"
						type="email"
						value={draft.Correo_electronico_manager ?? ''}
						onChange={(e) =>
							updateDraft('Correo_electronico_manager')(e.target.value)
						}
					/>
				</Field>
				<Field>
					<FieldLabel htmlFor="manager_pais">Pais</FieldLabel>
					<Input
						id="manager_pais"
						value={draft.Pais_de_nacionalidad_manager ?? ''}
						onChange={(e) =>
							updateDraft('Pais_de_nacionalidad_manager')(e.target.value)
						}
					/>
				</Field>
				<Field>
					<FieldLabel htmlFor="manager_pasaporte">Pasaporte</FieldLabel>
					<Input
						id="manager_pasaporte"
						value={draft.Numero_de_pasaporte_manager ?? ''}
						onChange={(e) =>
							updateDraft('Numero_de_pasaporte_manager')(e.target.value)
						}
					/>
				</Field>
				<Field>
					<FieldLabel htmlFor="manager_residente">Residente fiscal EE.UU</FieldLabel>
					<Select
						value={draft.residente_fiscal_en_EE_UU_manager ? 'Si' : 'No'}
						onValueChange={(value) =>
							updateDraft('residente_fiscal_en_EE_UU_manager')(value === 'Si')
						}
					>
						<SelectTrigger id="manager_residente" className="w-full">
							<SelectValue placeholder="Seleccione" />
						</SelectTrigger>
						<SelectContent>
							<SelectGroup>
								<SelectItem value="Si">Si</SelectItem>
								<SelectItem value="No">No</SelectItem>
							</SelectGroup>
						</SelectContent>
					</Select>
				</Field>
				<Field className="md:col-span-2">
					<FieldLabel htmlFor="manager_direccion_planilla">
						Direccion planilla
					</FieldLabel>
					<Input
						id="manager_direccion_planilla"
						value={draft.Direccion_de_planilla_manager ?? ''}
						onChange={(e) =>
							updateDraft('Direccion_de_planilla_manager')(e.target.value)
						}
					/>
				</Field>
			</FieldGroup>
		</div>
	);
}
