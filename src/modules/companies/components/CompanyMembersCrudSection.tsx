import * as React from 'react';
import { Icon } from '@iconify/react';
import { useLocalStorageState } from '@modules/admin/lib/use-local-storage-state';
import { Button } from '@components/ui/Button';
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from '@components/ui/Command';
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@components/ui/Popover';
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@components/ui/Dialog';
import {
	Sheet,
	SheetContent,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from '@components/ui/Sheet';
import {
	Field,
	FieldDescription,
	FieldGroup,
	FieldLabel,
} from '@components/ui/Field';
import { Input } from '@components/ui/Input';
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@components/ui/Select';
import { Switch } from '@components/ui/Switch';
import { cn } from '@components/utils';
import { PencilIcon, PlusIcon, UserPlusIcon } from 'lucide-react';

import type { CompanyMemberItem, MemberItem } from '../types';
import {
	type CompanyMemberRelationDraft,
	type MemberDraft,
	type MembersCrudScope,
	useCompanyMembersCrud,
} from '../hooks/use-company-members-crud';
import { useMembersSearch } from '../hooks/use-members-search';
import CrudFormSheet from './shared/CrudFormSheet';
import MemberAddressesPanel from './MemberAddressesPanel';
import { MemberCell } from './cells/MemberCell';
import { MemberEmptyState } from './cells/MemberEmptyState';
import { MemberRoleBadges } from './cells/MemberRoleBadges';
import { MemberRowActions } from './cells/MemberRowActions';
import { MemberTypeBadge } from './cells/MemberTypeBadge';
import {
	memberDisplayName,
	memberIdentification,
} from './cells/member-display';
import {
	matchMembersFilter,
	MembersToolbar,
	type MembersColumnId,
	type MembersFilter,
} from './MembersToolbar';

const DEFAULT_VISIBLE_COLUMNS: Record<MembersColumnId, boolean> = {
	type: true,
	percentage: true,
	start_date: true,
	role: true,
	actions: true,
};

interface Props {
	initialMembers: CompanyMemberItem[];
	scope: MembersCrudScope;
	canEditDetails: boolean;
}

export default function CompanyMembersCrudSection({
	initialMembers,
	scope,
	canEditDetails,
}: Props) {
	const crud = useCompanyMembersCrud({
		initialRows: initialMembers,
		scope,
	});

	const totalPercentage = crud.rows.reduce(
		(acc, row) => acc + (row.percentage ?? 0),
		0,
	);
	const overAllocated = totalPercentage > 100;

	const [deleteReason, setDeleteReason] = React.useState('');
	React.useEffect(() => {
		if (!crud.isDeleteOpen) setDeleteReason('');
	}, [crud.isDeleteOpen]);

	// Búsqueda local + sort en tabla (estilo UsuariosTable)
	const [search, setSearch] = React.useState('');
	const [sortKey, setSortKey] = React.useState<MembersSortKey>('name');
	const [sortDir, setSortDir] = React.useState<'asc' | 'desc'>('asc');
	const [filter, setFilter] = React.useState<MembersFilter>('todos');
	const [visibleColumns, setVisibleColumns] = useLocalStorageState<
		Record<MembersColumnId, boolean>
	>('company:members:columns', DEFAULT_VISIBLE_COLUMNS);
	const toggleColumn = (id: MembersColumnId) =>
		setVisibleColumns((prev) => ({ ...prev, [id]: !prev[id] }));

	const filteredSortedRows = React.useMemo(() => {
		const q = search.trim().toLowerCase();
		const base = crud.rows.filter((row) => {
			if (!matchMembersFilter(row, filter)) return false;
			if (!q) return true;
			const name = memberDisplayName(row.member).toLowerCase();
			const id = (row.member?.identification_number ?? '').toLowerCase();
			return name.includes(q) || id.includes(q);
		});
		const arr = [...base];
		arr.sort((a, b) => {
			const cmp = compareMembers(a, b, sortKey);
			return sortDir === 'asc' ? cmp : -cmp;
		});
		return arr;
	}, [crud.rows, search, filter, sortKey, sortDir]);

	const toggleSort = (key: MembersSortKey) => {
		if (sortKey === key) {
			setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
		} else {
			setSortKey(key);
			setSortDir('asc');
		}
	};

	return (
		<section className="-mx-5 -my-5 flex flex-col">
			{/* Header estilo /admin/usuarios */}
			<header className="flex items-end justify-between gap-4 border-b border-gray-200 px-7 pt-6 pb-4 dark:border-gray-800">
				<div>
					<p className="text-[11.5px] font-semibold tracking-wider text-gray-500 uppercase dark:text-gray-400">
						Miembros
					</p>
					<h3 className="mt-1 text-[22px] font-semibold text-gray-900 dark:text-gray-100">
						Socios y managers
					</h3>
					<p className="mt-1 text-[12.5px] text-gray-500 dark:text-gray-400">
						{crud.rows.length} miembros ·{' '}
						<span
							className={cn(
								'font-medium',
								overAllocated
									? 'text-amber-600 dark:text-amber-400'
									: 'text-gray-700 dark:text-gray-300',
							)}
						>
							{totalPercentage}% asignado
						</span>
						{overAllocated ? ' (excede 100%)' : ''}
					</p>
				</div>
				<Button
					type="button"
					size="sm"
					className="gap-1.5"
					onClick={crud.openCreate}
					disabled={!canEditDetails}
				>
					<UserPlusIcon className="size-4" />
					Agregar miembro
				</Button>
			</header>

			<MembersToolbar
				rows={crud.rows}
				activeFilter={filter}
				onFilterChange={setFilter}
				search={search}
				onSearchChange={setSearch}
				visibleColumns={visibleColumns}
				onToggleColumn={toggleColumn}
			/>

			{filteredSortedRows.length === 0 ? (
				<MemberEmptyState
					title={
						search || filter !== 'todos'
							? 'Sin resultados'
							: 'Aún no hay miembros'
					}
					description={
						search || filter !== 'todos'
							? 'Ajusta los filtros o la búsqueda para encontrar miembros.'
							: 'Agrega socios o managers para empezar a gestionar esta LLC.'
					}
				/>
			) : (
				<div className="w-full overflow-x-auto">
					<table className="w-full text-sm">
						<thead className="border-b border-gray-200 text-[10.5px] font-medium tracking-wider text-gray-500 uppercase dark:border-gray-800 dark:text-gray-400">
							<tr>
								<SortableTh
									label="Miembro"
									keyId="name"
									active={sortKey === 'name'}
									dir={sortDir}
									onClick={toggleSort}
									className="px-7 py-3 text-left"
								/>
								{visibleColumns.type && (
									<SortableTh
										label="Tipo"
										keyId="type"
										active={sortKey === 'type'}
										dir={sortDir}
										onClick={toggleSort}
										className="py-3 pr-4 text-left"
									/>
								)}
								{visibleColumns.percentage && (
									<SortableTh
										label="Porcentaje"
										keyId="percentage"
										active={sortKey === 'percentage'}
										dir={sortDir}
										onClick={toggleSort}
										className="py-3 pr-4 text-left"
									/>
								)}
								{visibleColumns.start_date && (
									<SortableTh
										label="Fecha inicio"
										keyId="start_date"
										active={sortKey === 'start_date'}
										dir={sortDir}
										onClick={toggleSort}
										className="py-3 pr-4 text-left"
									/>
								)}
								{visibleColumns.role && (
									<th className="py-3 pr-4 text-left">
										<span className="uppercase tracking-wider">Rol</span>
									</th>
								)}
								{visibleColumns.actions && (
									<th className="w-12 py-3 pr-7 text-right">
										<span className="sr-only">Acciones</span>
									</th>
								)}
							</tr>
						</thead>
						<tbody>
							{filteredSortedRows.map((row) => (
								<tr
									key={row.id}
									onClick={() => canEditDetails && crud.openEdit(row)}
									className={cn(
										'h-[52px] border-b border-gray-100 transition-colors dark:border-gray-800/60',
										canEditDetails
											? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-neutral-900/60'
											: '',
									)}
								>
									<td className="px-7">
										<MemberCell member={row.member} />
									</td>
									{visibleColumns.type && (
										<td className="pr-4">
											<MemberTypeBadge
												type={row.member?.person_type ?? null}
											/>
										</td>
									)}
									{visibleColumns.percentage && (
										<td className="pr-4">
											<span className="text-[12.5px] text-gray-700 dark:text-gray-300">
												{formatPercentage(row.percentage)}
											</span>
										</td>
									)}
									{visibleColumns.start_date && (
										<td className="pr-4">
											<span className="text-[12.5px] text-gray-700 dark:text-gray-300">
												{formatDate(row.start_date)}
											</span>
										</td>
									)}
									{visibleColumns.role && (
										<td className="pr-4">
											<MemberRoleBadges row={row} />
										</td>
									)}
									{visibleColumns.actions && (
										<td className="pr-7 text-right">
											<MemberRowActions
												row={row}
												canEdit={canEditDetails}
												onEdit={crud.openEdit}
												onDelete={crud.openDelete}
											/>
										</td>
									)}
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}

			{/* Crear miembro */}
			<CrudFormSheet
				open={crud.isCreateOpen}
				onOpenChange={crud.setIsCreateOpen}
				title="Agregar miembro a la empresa"
				description="Busca un miembro ya registrado o crea uno nuevo, y define su rol en esta LLC."
				submitLabel={crud.isSaving ? 'Guardando...' : 'Agregar miembro'}
				onSubmit={crud.createMember}
				submitDisabled={
					crud.isSaving ||
					!canEditDetails ||
					(!crud.isCreatingNewPerson && !crud.selectedMember) ||
					(crud.isCreatingNewPerson && !crud.hasMemberName) ||
					(!crud.relationDraft.is_member && !crud.relationDraft.is_manager)
				}
			>
				<div className="space-y-6 px-4">
					<MemberPicker
						selectedMember={crud.selectedMember}
						isCreatingNewPerson={crud.isCreatingNewPerson}
						onPickExisting={crud.pickExistingMember}
						onSwitchToNew={crud.switchToNewPerson}
					/>

					{crud.isCreatingNewPerson && (
						<MemberPiiForm
							draft={crud.memberDraft}
							updateDraft={crud.updateMemberDraft}
						/>
					)}

					{(crud.selectedMember || crud.isCreatingNewPerson) && (
						<RelationForm
							draft={crud.relationDraft}
							updateDraft={crud.updateRelationDraft}
						/>
					)}
				</div>
			</CrudFormSheet>

			{/* Editar relación */}
			<CrudFormSheet
				open={crud.isEditOpen}
				onOpenChange={crud.setIsEditOpen}
				title="Editar miembro"
				description="Cambia el rol, porcentaje o fecha de inicio. Para editar los datos personales, usa el botón al pie."
				submitLabel={crud.isSaving ? 'Guardando...' : 'Guardar cambios'}
				onSubmit={crud.saveRelation}
				submitDisabled={
					crud.isSaving ||
					!canEditDetails ||
					(!crud.relationDraft.is_member && !crud.relationDraft.is_manager)
				}
			>
				<div className="space-y-6 px-4">
					{crud.selectedMember ? (
						<div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
							<div className="flex items-center justify-between gap-3">
								<div>
									<p className="text-sm font-semibold">
										{displayName(crud.selectedMember)}
									</p>
									<p className="text-muted-foreground text-xs">
										{formatIdentification(crud.selectedMember)}
									</p>
								</div>
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={crud.openEditPerson}
								>
									<PencilIcon className="size-4" />
									Editar datos personales
								</Button>
							</div>
						</div>
					) : null}

					<RelationForm
						draft={crud.relationDraft}
						updateDraft={crud.updateRelationDraft}
					/>
				</div>
			</CrudFormSheet>

			{/* Editar persona */}
			<Sheet open={crud.isEditPersonOpen} onOpenChange={crud.setIsEditPersonOpen}>
				<SheetContent
					side="right"
					className="max-h-dvh w-full max-w-[600px] overflow-y-auto sm:max-w-3xl"
				>
					<SheetHeader className="pb-3">
						<SheetTitle>Editar datos personales</SheetTitle>
						<p className="text-muted-foreground text-sm">
							Estos datos se comparten con todas las empresas a las que pertenezca
							esta persona.
						</p>
					</SheetHeader>
					<div className="flex flex-col gap-6 px-4 pb-4">
						<MemberPiiForm
							draft={crud.memberDraft}
							updateDraft={crud.updateMemberDraft}
						/>
						<div className="border-t border-gray-200 pt-5 dark:border-gray-700">
							<MemberAddressesPanel
								memberId={crud.selectedMember?.id ?? null}
								canEdit={canEditDetails}
							/>
						</div>
					</div>
					<SheetFooter>
						<Button
							type="button"
							onClick={crud.savePerson}
							disabled={crud.isSaving || !crud.hasMemberName}
						>
							{crud.isSaving ? 'Guardando...' : 'Guardar persona'}
						</Button>
						<Button
							type="button"
							variant="outline"
							onClick={() => crud.setIsEditPersonOpen(false)}
						>
							Cancelar
						</Button>
					</SheetFooter>
				</SheetContent>
			</Sheet>

			{/* Eliminar (soft delete) */}
			<Dialog open={crud.isDeleteOpen} onOpenChange={crud.setIsDeleteOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Eliminar miembro de la empresa</DialogTitle>
					</DialogHeader>
					<p className="text-muted-foreground text-sm">
						Se marcará como eliminada la relación de{' '}
						<strong>
							{crud.activeRow?.member?.full_name ?? 'esta persona'}
						</strong>{' '}
						con la empresa. La persona seguirá disponible en el registro
						maestro.
					</p>
					<Field>
						<FieldLabel htmlFor="delete_reason">Motivo (opcional)</FieldLabel>
						<Input
							id="delete_reason"
							value={deleteReason}
							onChange={(e) => setDeleteReason(e.target.value)}
							placeholder="Ej: ya no es socio"
						/>
					</Field>
					<DialogFooter>
						<Button
							type="button"
							variant="destructive"
							onClick={() => crud.removeMember(deleteReason || null)}
							disabled={crud.isSaving}
						>
							{crud.isSaving ? 'Eliminando...' : 'Eliminar'}
						</Button>
						<Button
							type="button"
							variant="outline"
							onClick={() => crud.setIsDeleteOpen(false)}
						>
							Cancelar
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</section>
	);
}

// ────────────────────────────────────────────────────────────────
// Sub-componentes
// ────────────────────────────────────────────────────────────────

function MemberPicker({
	selectedMember,
	isCreatingNewPerson,
	onPickExisting,
	onSwitchToNew,
}: {
	selectedMember: MemberItem | null;
	isCreatingNewPerson: boolean;
	onPickExisting: (member: MemberItem) => void;
	onSwitchToNew: (initialName?: string) => void;
}) {
	const { query, setQuery, results, isLoading } = useMembersSearch();
	const [open, setOpen] = React.useState(false);

	const handleSelect = (memberId: string) => {
		const member = results.find((m) => m.id === memberId);
		if (member) {
			onPickExisting(member);
			setOpen(false);
		}
	};

	return (
		<Field>
			<FieldLabel htmlFor="member_picker">Persona</FieldLabel>

			{selectedMember && !isCreatingNewPerson ? (
				<div className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 p-3 dark:border-gray-700">
					<div>
						<p className="text-sm font-semibold">{displayName(selectedMember)}</p>
						<p className="text-muted-foreground text-xs">
							{formatIdentification(selectedMember)}
						</p>
					</div>
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={() => onSwitchToNew()}
					>
						Cambiar
					</Button>
				</div>
			) : (
				<Popover open={open} onOpenChange={setOpen}>
					<PopoverTrigger
						render={
							<Button
								id="member_picker"
								type="button"
								variant="outline"
								aria-expanded={open}
								className="w-full justify-between font-normal"
							>
								<span className="text-muted-foreground truncate">
									Buscar persona por nombre o identificación...
								</span>
								<PlusIcon className="ml-2 size-4 shrink-0 opacity-50" />
							</Button>
						}
					/>
					<PopoverContent
						className="w-[var(--anchor-width)] p-0"
						align="start"
					>
						<Command shouldFilter={false}>
							<CommandInput
								placeholder="Escribe para buscar..."
								value={query}
								onValueChange={setQuery}
							/>
							<CommandList>
								<CommandEmpty>
									{isLoading
										? 'Buscando...'
										: query.trim()
											? 'No hay coincidencias.'
											: 'Escribe para buscar personas.'}
								</CommandEmpty>
								{results.length > 0 ? (
									<CommandGroup heading="Personas">
										{results.map((member) => (
											<CommandItem
												key={member.id}
												value={member.id}
												onSelect={() => handleSelect(member.id)}
											>
												<div className="flex flex-col">
													<span className="text-sm">{displayName(member)}</span>
													<span className="text-muted-foreground text-xs">
														{formatIdentification(member)}
													</span>
												</div>
											</CommandItem>
										))}
									</CommandGroup>
								) : null}
							</CommandList>
						</Command>
					</PopoverContent>
				</Popover>
			)}

			<FieldDescription>
				¿No está en la lista?{' '}
				<button
					type="button"
					className="text-primary-600 hover:underline"
					onClick={() => {
						setOpen(false);
						onSwitchToNew(query);
					}}
				>
					<PlusIcon className="inline size-3" /> Crear nuevo miembro
				</button>
			</FieldDescription>
		</Field>
	);
}

function MemberPiiForm({
	draft,
	updateDraft,
}: {
	draft: MemberDraft;
	updateDraft: <K extends keyof MemberDraft>(
		field: K,
	) => (value: MemberDraft[K]) => void;
}) {
	const isEntity = draft.person_type === 'juridical_person';
	return (
		<FieldGroup className="grid gap-4 md:grid-cols-2">
			<Field className="md:col-span-2">
				<FieldLabel htmlFor="member_person_type">Tipo de persona *</FieldLabel>
				<Select
					value={draft.person_type}
					onValueChange={(value) => {
						updateDraft('person_type')(value as MemberDraft['person_type']);
						if (value === 'juridical_person') {
							updateDraft('identification_type')('ein');
						} else {
							updateDraft('identification_type')('passport');
						}
					}}
				>
					<SelectTrigger id="member_person_type" className="w-full">
						<SelectValue placeholder="Selecciona el tipo de persona" />
					</SelectTrigger>
					<SelectContent>
						<SelectGroup>
							<SelectItem value="natural_person">Persona natural</SelectItem>
							<SelectItem value="juridical_person">Persona jurídica</SelectItem>
						</SelectGroup>
					</SelectContent>
				</Select>
			</Field>

			{isEntity ? (
				<Field className="md:col-span-2">
					<FieldLabel htmlFor="member_entity_name">Razón social *</FieldLabel>
					<Input
						id="member_entity_name"
						value={draft.name}
						onChange={(e) => updateDraft('name')(e.target.value)}
					/>
				</Field>
			) : (
				<>
					<Field>
						<FieldLabel htmlFor="member_first_name">Nombres *</FieldLabel>
						<Input
							id="member_first_name"
							value={draft.first_name}
							onChange={(e) => updateDraft('first_name')(e.target.value)}
						/>
					</Field>
					<Field>
						<FieldLabel htmlFor="member_last_name">Apellidos *</FieldLabel>
						<Input
							id="member_last_name"
							value={draft.last_name}
							onChange={(e) => updateDraft('last_name')(e.target.value)}
						/>
					</Field>
				</>
			)}

			<Field>
				<FieldLabel htmlFor="member_id_type">Tipo de identificación</FieldLabel>
				<Select
					value={draft.identification_type}
					onValueChange={(value) =>
						updateDraft('identification_type')(
							value as MemberDraft['identification_type'],
						)
					}
				>
					<SelectTrigger id="member_id_type" className="w-full">
						<SelectValue placeholder="Tipo de identificación" />
					</SelectTrigger>
					<SelectContent>
						<SelectGroup>
							<SelectItem value="passport">Pasaporte</SelectItem>
							<SelectItem value="national_id">Cédula / ID Nacional</SelectItem>
							<SelectItem value="driver_licence">Licencia de conducir</SelectItem>
							<SelectItem value="ein">EIN</SelectItem>
						</SelectGroup>
					</SelectContent>
				</Select>
			</Field>
			<Field>
				<FieldLabel htmlFor="member_id_number">Número de identificación</FieldLabel>
				<Input
					id="member_id_number"
					value={draft.identification_number}
					onChange={(e) => updateDraft('identification_number')(e.target.value)}
				/>
			</Field>

			{!isEntity && (
				<>
					<Field>
						<FieldLabel htmlFor="member_birth_date">Fecha de nacimiento</FieldLabel>
						<Input
							id="member_birth_date"
							type="date"
							value={draft.birth_date}
							onChange={(e) => updateDraft('birth_date')(e.target.value)}
						/>
					</Field>
					<Field>
						<FieldLabel htmlFor="member_marital">Estado civil</FieldLabel>
						<Select
							value={draft.marital_status || ''}
							onValueChange={(value) =>
								updateDraft('marital_status')(value as MemberDraft['marital_status'])
							}
						>
							<SelectTrigger id="member_marital" className="w-full">
								<SelectValue placeholder="Seleccione" />
							</SelectTrigger>
							<SelectContent>
								<SelectGroup>
									<SelectItem value="single">Soltero/a</SelectItem>
									<SelectItem value="married">Casado/a</SelectItem>
									<SelectItem value="widowed">Viudo/a</SelectItem>
									<SelectItem value="divorced">Divorciado/a</SelectItem>
									<SelectItem value="legally_separated">Separación legal</SelectItem>
									<SelectItem value="civil_union">Unión civil</SelectItem>
									<SelectItem value="annulled">Anulado</SelectItem>
								</SelectGroup>
							</SelectContent>
						</Select>
					</Field>
					<Field>
						<FieldLabel htmlFor="member_ssn">SSN</FieldLabel>
						<Input
							id="member_ssn"
							value={draft.ssn}
							onChange={(e) => updateDraft('ssn')(e.target.value)}
						/>
					</Field>
					<Field>
						<FieldLabel htmlFor="member_itin">ITIN</FieldLabel>
						<Input
							id="member_itin"
							value={draft.itin}
							onChange={(e) => updateDraft('itin')(e.target.value)}
						/>
					</Field>
				</>
			)}

			{isEntity && (
				<Field>
					<FieldLabel htmlFor="member_incorporation_date">
						Fecha de constitución
					</FieldLabel>
					<Input
						id="member_incorporation_date"
						type="date"
						value={draft.incorporation_date}
						onChange={(e) => updateDraft('incorporation_date')(e.target.value)}
					/>
				</Field>
			)}
		</FieldGroup>
	);
}

function RelationForm({
	draft,
	updateDraft,
}: {
	draft: CompanyMemberRelationDraft;
	updateDraft: <K extends keyof CompanyMemberRelationDraft>(
		field: K,
	) => (value: CompanyMemberRelationDraft[K]) => void;
}) {
	const roleError = !draft.is_member && !draft.is_manager;
	return (
		<FieldGroup className="grid gap-4 md:grid-cols-2">
			<Field>
				<FieldLabel htmlFor="relation_percentage">Porcentaje (%)</FieldLabel>
				<Input
					id="relation_percentage"
					type="number"
					min={0}
					max={100}
					step="0.01"
					value={draft.percentage ?? ''}
					onChange={(e) =>
						updateDraft('percentage')(
							e.target.value === '' ? null : Number(e.target.value),
						)
					}
				/>
			</Field>
			<Field>
				<FieldLabel htmlFor="relation_start_date">Fecha de inicio</FieldLabel>
				<Input
					id="relation_start_date"
					type="date"
					value={draft.start_date}
					onChange={(e) => updateDraft('start_date')(e.target.value)}
				/>
				<FieldDescription>
					Cuando esta persona se sumó como miembro de la empresa.
				</FieldDescription>
			</Field>
			<Field className="md:col-span-2">
				<FieldLabel>Rol en la empresa *</FieldLabel>
				<div className="flex flex-col gap-3 rounded-lg border border-gray-200 p-3 dark:border-gray-700">
					<label className="flex items-center justify-between gap-3 text-sm">
						<div>
							<p className="font-medium">Socio</p>
							<p className="text-muted-foreground text-xs">
								Tiene participación accionaria en la LLC.
							</p>
						</div>
						<Switch
							checked={draft.is_member}
							onCheckedChange={(value) => updateDraft('is_member')(value)}
						/>
					</label>
					<label className="flex items-center justify-between gap-3 text-sm">
						<div>
							<p className="font-medium">Manager</p>
							<p className="text-muted-foreground text-xs">
								Administra la operación de la LLC.
							</p>
						</div>
						<Switch
							checked={draft.is_manager}
							onCheckedChange={(value) => updateDraft('is_manager')(value)}
						/>
					</label>
				</div>
				{roleError ? (
					<FieldDescription className="text-destructive">
						Debe ser socio, manager o ambos.
					</FieldDescription>
				) : null}
			</Field>
		</FieldGroup>
	);
}

// ────────────────────────────────────────────────────────────────
// Sort + helpers
// ────────────────────────────────────────────────────────────────

type MembersSortKey = 'name' | 'type' | 'percentage' | 'start_date';

function SortableTh({
	label,
	keyId,
	active,
	dir,
	onClick,
	className,
}: {
	label: string;
	keyId: MembersSortKey;
	active: boolean;
	dir: 'asc' | 'desc';
	onClick: (key: MembersSortKey) => void;
	className?: string;
}) {
	return (
		<th className={className}>
			<button
				type="button"
				onClick={() => onClick(keyId)}
				className="inline-flex items-center gap-1 uppercase tracking-wider hover:text-gray-900 dark:hover:text-gray-100"
			>
				{label}
				{active && (
					<Icon
						icon={dir === 'asc' ? 'ri:arrow-up-s-line' : 'ri:arrow-down-s-line'}
						className="h-3.5 w-3.5"
					/>
				)}
			</button>
		</th>
	);
}

function compareMembers(
	a: CompanyMemberItem,
	b: CompanyMemberItem,
	key: MembersSortKey,
): number {
	switch (key) {
		case 'name':
			return memberDisplayName(a.member).localeCompare(
				memberDisplayName(b.member),
			);
		case 'type': {
			const av = a.member?.person_type ?? '';
			const bv = b.member?.person_type ?? '';
			return av.localeCompare(bv);
		}
		case 'percentage':
			return (a.percentage ?? 0) - (b.percentage ?? 0);
		case 'start_date': {
			const av = a.start_date ? new Date(a.start_date).getTime() : 0;
			const bv = b.start_date ? new Date(b.start_date).getTime() : 0;
			return av - bv;
		}
		default:
			return 0;
	}
}

function formatDate(value: string | null) {
	if (!value) return '-';
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) return '-';
	return parsed.toLocaleDateString('es-ES');
}

function formatPercentage(value: number | null) {
	if (value === null || Number.isNaN(value)) return '-';
	return `${value}%`;
}

// Re-export helpers locales para que el resto del archivo (MemberPicker, dialog
// "Editar persona") siga funcionando sin importar dos veces.
function displayName(member: MemberItem | null) {
	return memberDisplayName(member);
}

function formatIdentification(member: MemberItem | null) {
	return memberIdentification(member);
}
