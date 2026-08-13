import * as React from 'react';
import { Icon } from '@iconify/react';
import { useLocalStorageState } from '@modules/admin/lib/use-local-storage-state';
import { Button } from '@components/ui/Button';
import {
	Combobox,
	ComboboxContent,
	ComboboxEmpty,
	ComboboxInput,
	ComboboxItem,
	ComboboxList,
} from '@components/ui/Combobox';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@components/ui/DropdownMenu';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@components/ui/Tabs';
import { cn } from '@components/utils';
import { PencilIcon, PlusIcon, Trash2Icon, UserPlusIcon } from 'lucide-react';

import type { CompanyMemberItem, MemberItem } from '../types';
import {
	type CompanyMemberRelationDraft,
	type MemberDraft,
	type MembersCrudScope,
	useCompanyMembersCrud,
} from '../hooks/use-company-members-crud';
import { useMembersSearch } from '../hooks/use-members-search';
import CrudFormSheet, { CrudSheetFooter } from './shared/CrudFormSheet';
import MemberAddressesPanel from './MemberAddressesPanel';
import MemberDocumentsPanel from './MemberDocumentsPanel';
import MemberSummaryCard from './MemberSummaryCard';
import { MemberCell } from './cells/MemberCell';
import { MemberEmptyState } from './cells/MemberEmptyState';
import { MemberRoleBadges } from './cells/MemberRoleBadges';
import { MemberRowActions } from './cells/MemberRowActions';
import { MemberTypeBadge } from './cells/MemberTypeBadge';
import {
	memberDisplayName,
	memberIdentification,
	memberIdentificationNumber,
	memberIdentificationTypeLabel,
} from './cells/member-display';
import {
	matchMembersFilter,
	MembersToolbar,
	type MembersColumnId,
	type MembersFilter,
} from './MembersToolbar';

const DEFAULT_VISIBLE_COLUMNS: Record<MembersColumnId, boolean> = {
	identification_type: true,
	identification_number: true,
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
	// v2: la identificación pasó de ir apilada bajo el nombre a tener sus propias
	// columnas. La clave cambia para no arrastrar preferencias guardadas sin esas
	// claves nuevas (se leerían como columnas ocultas).
	const [visibleColumns, setVisibleColumns] = useLocalStorageState<
		Record<MembersColumnId, boolean>
	>('company:members:columns:v2', DEFAULT_VISIBLE_COLUMNS);
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
		<section className="-mx-6 -my-5 flex flex-col">
			<header className="border-border flex items-end justify-between gap-4 border-b px-7 pt-6 pb-4">
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
								{visibleColumns.identification_type && (
									<SortableTh
										label="Tipo de ID"
										keyId="identification_type"
										active={sortKey === 'identification_type'}
										dir={sortDir}
										onClick={toggleSort}
										className="py-3 pr-4 text-left"
									/>
								)}
								{visibleColumns.identification_number && (
									<SortableTh
										label="Nº de identificación"
										keyId="identification_number"
										active={sortKey === 'identification_number'}
										dir={sortDir}
										onClick={toggleSort}
										className="py-3 pr-4 text-left"
									/>
								)}
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
										<span className="tracking-wider uppercase">Rol</span>
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
									{visibleColumns.identification_type && (
										<td className="pr-4">
											<span className="text-[12.5px] text-gray-700 dark:text-gray-300">
												{memberIdentificationTypeLabel(row.member)}
											</span>
										</td>
									)}
									{visibleColumns.identification_number && (
										<td className="pr-4">
											<span className="text-[12.5px] text-gray-700 tabular-nums dark:text-gray-300">
												{memberIdentificationNumber(row.member)}
											</span>
										</td>
									)}
									{visibleColumns.type && (
										<td className="pr-4">
											<MemberTypeBadge type={row.member?.person_type ?? null} />
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
				<div className="space-y-6 px-5">
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
				submitLabel={crud.isSaving ? 'Guardando...' : 'Guardar cambios'}
				onSubmit={crud.saveRelation}
				headerMenu={
					<DropdownMenu>
						<DropdownMenuTrigger
							render={<Button variant="ghost" size="icon-sm" />}
							aria-label="Opciones del miembro"
						>
							<Icon icon="ri:more-2-fill" className="h-4 w-4" />
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end" className="w-56">
							<DropdownMenuItem
								disabled={!canEditDetails}
								onClick={crud.openEditPerson}
							>
								<PencilIcon className="size-4" />
								Editar datos personales
							</DropdownMenuItem>
							<DropdownMenuItem
								variant="destructive"
								disabled={!canEditDetails || crud.isSaving}
								onClick={() => {
									const row = crud.activeRow;
									if (!row) return;
									// El sheet se cierra antes de abrir el diálogo: dos capas
									// modales superpuestas dejan el foco atrapado en la de abajo.
									crud.setIsEditOpen(false);
									crud.openDelete(row);
								}}
							>
								<Trash2Icon className="size-4" />
								Eliminar miembro
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				}
				submitDisabled={
					crud.isSaving ||
					!canEditDetails ||
					(!crud.relationDraft.is_member && !crud.relationDraft.is_manager)
				}
				headerContent={
					crud.selectedMember ? (
						<MemberSummaryCard
							member={crud.selectedMember}
							row={crud.activeRow}
						/>
					) : null
				}
			>
				<Tabs defaultValue="relation" className="min-w-0 px-5 pt-4">
					<TabsList className="w-full">
						<TabsTrigger value="relation" className="flex-1">
							Relación
						</TabsTrigger>
						<TabsTrigger value="documents" className="flex-1">
							Documentos
						</TabsTrigger>
					</TabsList>

					<TabsContent value="relation" className="pt-4">
						<RelationForm
							draft={crud.relationDraft}
							updateDraft={crud.updateRelationDraft}
						/>
					</TabsContent>

					{/* Consulta: los documentos son de la persona, no de su relación
					    con esta empresa. La carga vive en "Editar datos personales". */}
					<TabsContent value="documents" className="pt-4">
						<MemberDocumentsPanel
							memberId={crud.selectedMember?.id ?? null}
							owner={scope}
							canUpload={false}
							description="Documentos de la persona. Para cargar o reemplazar archivos, usa “Editar datos personales”."
						/>
					</TabsContent>
				</Tabs>
			</CrudFormSheet>

			{/* Editar persona */}
			<Sheet
				open={crud.isEditPersonOpen}
				onOpenChange={crud.setIsEditPersonOpen}
			>
				<SheetContent
					side="right"
					className="flex h-dvh w-full max-w-[600px] flex-col gap-0 overflow-hidden sm:max-w-3xl"
				>
					<SheetHeader className="shrink-0 px-5 pt-5 pb-3">
						<SheetTitle>Editar datos personales</SheetTitle>
						<p className="text-muted-foreground text-sm">
							Estos datos se comparten con todas las empresas a las que
							pertenezca esta persona.
						</p>
					</SheetHeader>
					<div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pt-4 pb-5">
						<Tabs defaultValue="personal" className="min-w-0">
							<TabsList className="w-full">
								<TabsTrigger value="personal" className="flex-1">
									Personales
								</TabsTrigger>
								<TabsTrigger value="addresses" className="flex-1">
									Direcciones
								</TabsTrigger>
								<TabsTrigger value="documents" className="flex-1">
									Documentos
								</TabsTrigger>
							</TabsList>

							<TabsContent value="personal" className="pt-4">
								<MemberPiiForm
									draft={crud.memberDraft}
									updateDraft={crud.updateMemberDraft}
								/>
							</TabsContent>
							<TabsContent value="addresses" className="pt-4">
								<MemberAddressesPanel
									memberId={crud.selectedMember?.id ?? null}
									canEdit={canEditDetails}
								/>
							</TabsContent>
							<TabsContent value="documents" className="pt-4">
								<MemberDocumentsPanel
									memberId={crud.selectedMember?.id ?? null}
									owner={scope}
									canUpload={canEditDetails}
								/>
							</TabsContent>
						</Tabs>
					</div>
					<CrudSheetFooter
						submitLabel={crud.isSaving ? 'Guardando...' : 'Guardar persona'}
						onSubmit={crud.savePerson}
						submitDisabled={crud.isSaving || !crud.hasMemberName}
						onCancel={() => crud.setIsEditPersonOpen(false)}
					/>
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
							{crud.activeRow?.member?.name ??
								[
									crud.activeRow?.member?.first_name,
									crud.activeRow?.member?.last_name,
								]
									.filter(Boolean)
									.join(' ') ??
								'esta persona'}
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
					<DialogFooter className="flex-row items-center justify-between gap-2">
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={() => crud.setIsDeleteOpen(false)}
						>
							Cancelar
						</Button>
						<Button
							type="button"
							variant="destructive"
							size="sm"
							className="gap-1.5"
							onClick={() => crud.removeMember(deleteReason || null)}
							disabled={crud.isSaving}
						>
							<Trash2Icon className="size-4" />
							{crud.isSaving ? 'Eliminando...' : 'Eliminar'}
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

	return (
		<Field>
			<FieldLabel htmlFor="member_picker">Persona</FieldLabel>

			{selectedMember && !isCreatingNewPerson ? (
				<div className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 p-3 dark:border-gray-700">
					<div>
						<p className="text-sm font-semibold">
							{displayName(selectedMember)}
						</p>
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
				<Combobox
					items={results}
					itemToStringValue={(member: MemberItem) => member.id}
					itemToStringLabel={(member: MemberItem) => displayName(member)}
					value={null}
					onValueChange={(member) => {
						if (member) onPickExisting(member as MemberItem);
					}}
					inputValue={query}
					onInputValueChange={setQuery}
					filter={null}
				>
					<ComboboxInput
						id="member_picker"
						placeholder="Buscar persona por nombre o identificación..."
						className="w-full"
					/>
					<ComboboxContent>
						<ComboboxEmpty>
							{isLoading
								? 'Buscando...'
								: query.trim()
									? 'No hay coincidencias.'
									: 'Escribe para buscar personas.'}
						</ComboboxEmpty>
						<ComboboxList>
							{(member: MemberItem) => (
								<ComboboxItem key={member.id} value={member}>
									<div className="flex flex-col">
										<span className="text-sm">{displayName(member)}</span>
										<span className="text-muted-foreground text-xs">
											{formatIdentification(member)}
										</span>
									</div>
								</ComboboxItem>
							)}
						</ComboboxList>
					</ComboboxContent>
				</Combobox>
			)}

			<FieldDescription>
				¿No está en la lista?{' '}
				<button
					type="button"
					className="text-primary-600 hover:underline"
					onClick={() => onSwitchToNew(query)}
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
	const isEntity = draft.person_type === 'entity';
	return (
		<FieldGroup className="grid gap-4 md:grid-cols-2">
			<Field className="md:col-span-2">
				<FieldLabel htmlFor="member_person_type">Tipo de persona *</FieldLabel>
				<Select
					value={draft.person_type}
					onValueChange={(value) => {
						updateDraft('person_type')(value as MemberDraft['person_type']);
						if (value === 'entity') {
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
							<SelectItem value="individual">Persona natural</SelectItem>
							<SelectItem value="entity">Persona jurídica</SelectItem>
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
							<SelectItem value="id">Cédula / ID Nacional</SelectItem>
							<SelectItem value="drivers_license">
								Licencia de conducir
							</SelectItem>
							<SelectItem value="ein">EIN</SelectItem>
						</SelectGroup>
					</SelectContent>
				</Select>
			</Field>
			<Field>
				<FieldLabel htmlFor="member_id_number">
					Número de identificación
				</FieldLabel>
				<Input
					id="member_id_number"
					value={draft.identification_number}
					onChange={(e) => updateDraft('identification_number')(e.target.value)}
				/>
			</Field>

			{!isEntity && (
				<>
					<Field>
						<FieldLabel htmlFor="member_birth_date">
							Fecha de nacimiento
						</FieldLabel>
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
								updateDraft('marital_status')(
									value as MemberDraft['marital_status'],
								)
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
									<SelectItem value="legally_separated">
										Separación legal
									</SelectItem>
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
			</Field>
			<Field className="md:col-span-2">
				<FieldLabel>Rol en la empresa *</FieldLabel>
				<div className="flex flex-col gap-3">
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

type MembersSortKey =
	| 'name'
	| 'identification_type'
	| 'identification_number'
	| 'type'
	| 'percentage'
	| 'start_date';

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
				className="inline-flex items-center gap-1 tracking-wider uppercase hover:text-gray-900 dark:hover:text-gray-100"
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
		case 'identification_type':
			return memberIdentificationTypeLabel(a.member).localeCompare(
				memberIdentificationTypeLabel(b.member),
			);
		case 'identification_number':
			return memberIdentificationNumber(a.member).localeCompare(
				memberIdentificationNumber(b.member),
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
