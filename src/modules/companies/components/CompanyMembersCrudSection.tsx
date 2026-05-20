import * as React from 'react';
import { Button } from '@components/ui/Button';
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@components/ui/Dialog';
import {
	Field,
	FieldDescription,
	FieldGroup,
	FieldLabel,
} from '@components/ui/Field';
import { Input } from '@components/ui/Input';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@components/ui/DropdownMenu';
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
import { ScrollArea, ScrollBar } from '@components/ui/ScrollArea';
import {
	DropzoneDescription,
	DropzoneError,
	DropzoneField,
	DropzoneFileList,
	DropzoneHint,
	DropzoneIcon,
	DropzoneTitle,
	DropzoneTrigger,
} from '@components/ui/DropzoneField';
import { EllipsisVerticalIcon, PencilIcon, Trash2Icon } from 'lucide-react';
import type { CompanyMemberItem } from '../types';
import { useCompanyMembersCrud } from '../hooks/use-company-members-crud';
import CrudFormSheet from './shared/CrudFormSheet';

interface Props {
	initialMembers: CompanyMemberItem[];
	incorporationId: string;
	canEditDetails: boolean;
}

export default function CompanyMembersCrudSection({
	initialMembers,
	incorporationId,
	canEditDetails,
}: Props) {
	const {
		members,
		activeMember,
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
		updateTaxAddress,
		createMember,
		saveMember,
		removeMember,
		isSaving,
	} = useCompanyMembersCrud(initialMembers, incorporationId);

	const totalPercentage = members.reduce(
		(acc, member) => acc + (member.percentage ?? 0),
		0,
	);

	return (
		<section className="flex flex-col gap-4 border-gray-200 dark:border-gray-700">
			<header className="flex flex-col gap-1">
				<h3 className="text-lg font-semibold">Socios</h3>
				<p className="text-muted-foreground text-sm">
					Revisa o edita la información de los miembros de la empresa.
				</p>
			</header>
			<div className="flex items-center justify-between">
				<h3 className="text-sm font-semibold">Socios</h3>
				<Button
					type="button"
					variant="outline"
					onClick={openCreate}
					disabled={!canEditDetails}
				>
					Agregar socio
				</Button>
			</div>

			<ScrollArea className="w-full rounded-lg border border-gray-200 dark:border-gray-700">
				<Table className="min-w-[980px]">
					<TableHeader>
						<TableRow>
							<TableHead>Nombre</TableHead>
							<TableHead>Correo</TableHead>
							<TableHead>Tipo</TableHead>
							<TableHead>Porcentaje</TableHead>
							<TableHead>Rol</TableHead>
							<TableHead>Dirección fiscal</TableHead>
							<TableHead className="text-right">Acciones</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{members.length ? (
							members.map((member) => (
								<TableRow key={member.id}>
									<TableCell>{member.full_name ?? 'Sin nombre'}</TableCell>
									<TableCell>{member.email ?? '-'}</TableCell>
									<TableCell>{member.member_type ?? '-'}</TableCell>
									<TableCell>{member.percentage ?? '-'}</TableCell>
									<TableCell>{formatRoles(member)}</TableCell>
									<TableCell>{member.tax_address?.line1 ?? '-'}</TableCell>
									<TableCell className="text-right">
										<DropdownMenu>
											<DropdownMenuTrigger
												render={
													<Button
														type="button"
														variant="outline"
														size="icon-sm"
														disabled={!canEditDetails}
														aria-label={`Acciones para ${member.full_name ?? 'socio'}`}
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
													<DropdownMenuItem onClick={() => openEdit(member)}>
														<PencilIcon />
														Editar
													</DropdownMenuItem>
													<DropdownMenuItem
														variant="destructive"
														onClick={() => openDelete(member)}
													>
														<Trash2Icon />
														Eliminar
													</DropdownMenuItem>
												</DropdownMenuGroup>
											</DropdownMenuContent>
										</DropdownMenu>
									</TableCell>
								</TableRow>
							))
						) : (
							<TableRow>
								<TableCell colSpan={7} className="h-20 text-center">
									No hay socios o managers registrados en company_members.
								</TableCell>
							</TableRow>
						)}
					</TableBody>
					<TableFooter>
						<TableRow>
							<TableCell colSpan={3} className="font-medium">
								({members.length} registros)
							</TableCell>
							<TableCell className="font-medium">{totalPercentage}%</TableCell>
							<TableCell
								colSpan={4}
								className="text-right font-medium"
							></TableCell>
						</TableRow>
					</TableFooter>
				</Table>
				<ScrollBar orientation="horizontal" />
			</ScrollArea>

			<CrudFormSheet
				open={isCreateOpen}
				onOpenChange={setIsCreateOpen}
				title="Agregar socio"
				submitLabel="Agregar"
				onSubmit={createMember}
			>
				<MemberForm
					draft={draft}
					updateDraft={updateDraft}
					updateTaxAddress={updateTaxAddress}
				/>
			</CrudFormSheet>

			<CrudFormSheet
				open={isEditOpen}
				onOpenChange={setIsEditOpen}
				title="Editar socio"
				submitLabel="Guardar"
				onSubmit={saveMember}
			>
				<MemberForm
					draft={draft}
					updateDraft={updateDraft}
					updateTaxAddress={updateTaxAddress}
				/>
			</CrudFormSheet>

			<Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Eliminar socio</DialogTitle>
					</DialogHeader>
					<p className="text-muted-foreground text-sm">
						Se marcara a {activeMember?.full_name ?? 'este socio'} como
						eliminado. El registro no se borrara fisicamente.
					</p>
					<DialogFooter>
						<Button
							type="button"
							variant="destructive"
							onClick={removeMember}
							disabled={isSaving}
						>
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

function formatRoles(member: CompanyMemberItem) {
	const roles = [];
	if (member.is_member) roles.push('Socio');
	if (member.is_manager) roles.push('Manager');
	return roles.length ? roles.join(' / ') : '-';
}

function MemberForm({
	draft,
	updateDraft,
	updateTaxAddress,
}: {
	draft: any;
	updateDraft: any;
	updateTaxAddress: any;
}) {
	return (
		<div className="grid flex-1 auto-rows-min gap-6 px-4">
			<FieldGroup className="grid gap-4 md:grid-cols-2">
				<Field>
					<FieldLabel htmlFor="member_nombre">Nombre</FieldLabel>
					<Input
						id="member_nombre"
						value={draft.full_name ?? ''}
						onChange={(e) => updateDraft('full_name')(e.target.value)}
					/>
				</Field>
				<Field>
					<FieldLabel htmlFor="member_correo">Correo</FieldLabel>
					<Input
						id="member_correo"
						type="email"
						value={draft.email ?? ''}
						onChange={(e) => updateDraft('email')(e.target.value)}
					/>
				</Field>
				<Field>
					<FieldLabel htmlFor="member_tipo">Tipo</FieldLabel>
					<Input
						id="member_tipo"
						value={draft.member_type ?? ''}
						onChange={(e) => updateDraft('member_type')(e.target.value)}
					/>
				</Field>
				<Field>
					<FieldLabel htmlFor="member_porcentaje">Porcentaje</FieldLabel>
					<Input
						id="member_porcentaje"
						type="number"
						value={draft.percentage ?? ''}
						onChange={(e) =>
							updateDraft('percentage')(
								e.target.value === '' ? null : Number(e.target.value),
							)
						}
					/>
				</Field>
				<Field>
					<FieldLabel htmlFor="member_residente">Residente fiscal</FieldLabel>
					<Select
						value={
							draft.is_us_tax_resident === null
								? ''
								: draft.is_us_tax_resident
									? 'Si'
									: 'No'
						}
						onValueChange={(value) =>
							updateDraft('is_us_tax_resident')(value === 'Si')
						}
					>
						<SelectTrigger id="member_residente" className="w-full">
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
				<Field>
					<FieldLabel htmlFor="member_pasaporte">Pasaporte</FieldLabel>
					<Input
						id="member_pasaporte"
						value={draft.passport_number ?? ''}
						onChange={(e) => updateDraft('passport_number')(e.target.value)}
					/>
				</Field>
				<Field className="md:col-span-2">
					<FieldLabel htmlFor="member_direccion_planilla">
						Direccion fiscal
					</FieldLabel>
					<Input
						id="member_direccion_planilla"
						value={draft.tax_address.line1}
						onChange={(e) => updateTaxAddress('line1')(e.target.value)}
					/>
				</Field>
				<Field>
					<FieldLabel htmlFor="member_address_city">Ciudad</FieldLabel>
					<Input
						id="member_address_city"
						value={draft.tax_address.city}
						onChange={(e) => updateTaxAddress('city')(e.target.value)}
					/>
				</Field>
				<Field>
					<FieldLabel htmlFor="member_address_state">
						Estado/Provincia
					</FieldLabel>
					<Input
						id="member_address_state"
						value={draft.tax_address.state}
						onChange={(e) => updateTaxAddress('state')(e.target.value)}
					/>
				</Field>
				<Field>
					<FieldLabel htmlFor="member_address_zip">ZIP</FieldLabel>
					<Input
						id="member_address_zip"
						value={draft.tax_address.zip}
						onChange={(e) => updateTaxAddress('zip')(e.target.value)}
					/>
				</Field>
			</FieldGroup>
			<FieldGroup className="grid gap-4 md:grid-cols-2">
				<Field>
					<FieldLabel htmlFor="member_passport_file">Pasaporte</FieldLabel>
					<FieldDescription>
						Opcional. Sube un PDF o imagen del pasaporte.
					</FieldDescription>
					<DropzoneField
						name="passport_file"
						id="member_passport_file"
						maxFileSizeMb={15}
						maxFiles={1}
						multipleFiles={false}
						hideTriggerWhenSingleFileSelected
						size="sm"
						helperText="PDF, DOC, XLS o imagen. Maximo 15 MB."
					>
						<DropzoneTrigger>
							<DropzoneIcon />
							<DropzoneTitle>Adjunta el pasaporte</DropzoneTitle>
							<DropzoneDescription>
								Arrastra o haz clic para seleccionar.
							</DropzoneDescription>
							<DropzoneHint />
						</DropzoneTrigger>
						<DropzoneFileList />
						<DropzoneError />
					</DropzoneField>
				</Field>

				<Field>
					<FieldLabel htmlFor="member_service_sheet_file">
						Planilla de servicio
					</FieldLabel>
					<FieldDescription>
						Opcional. Adjunta la planilla del socio.
					</FieldDescription>
					<DropzoneField
						name="service_sheet_file"
						id="member_service_sheet_file"
						maxFileSizeMb={15}
						maxFiles={1}
						multipleFiles={false}
						hideTriggerWhenSingleFileSelected
						size="sm"
						helperText="PDF, DOC, XLS o imagen. Maximo 15 MB."
					>
						<DropzoneTrigger>
							<DropzoneIcon />
							<DropzoneTitle>Adjunta la planilla</DropzoneTitle>
							<DropzoneDescription>
								Arrastra o haz clic para seleccionar.
							</DropzoneDescription>
							<DropzoneHint />
						</DropzoneTrigger>
						<DropzoneFileList />
						<DropzoneError />
					</DropzoneField>
				</Field>
			</FieldGroup>
		</div>
	);
}
