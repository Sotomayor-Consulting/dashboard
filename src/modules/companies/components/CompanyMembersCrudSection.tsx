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
} from '@components/ui/Table';
import type { SocioItem } from '../types';
import { useCompanyMembersCrud } from '../hooks/use-company-members-crud';

interface Props {
	initialMembers: SocioItem[];
	canEditDetails: boolean;
}

export default function CompanyMembersCrudSection({
	initialMembers,
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
		createMember,
		saveMember,
		removeMember,
	} = useCompanyMembersCrud(initialMembers);

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

			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Nombre</TableHead>
						<TableHead>Correo</TableHead>
						<TableHead>Tipo</TableHead>
						<TableHead>Porcentaje</TableHead>
						<TableHead>Pais</TableHead>
						<TableHead className="text-right">Acciones</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{members.map((member) => (
						<TableRow key={member.id}>
							<TableCell>{member.nombre_de_socio ?? 'Sin nombre'}</TableCell>
							<TableCell>{member.correo ?? '-'}</TableCell>
							<TableCell>{member.tipo_de_socio ?? '-'}</TableCell>
							<TableCell>{member.porcentaje ?? '-'}</TableCell>
							<TableCell>{member.pais_de_nacionalidad ?? '-'}</TableCell>
							<TableCell>{member.estado_civil ?? '-'}</TableCell>
							<TableCell>{member.residente_fiscal ?? '-'}</TableCell>
							<TableCell className="text-right">
								<div className="flex justify-end gap-2">
									<Button
										type="button"
										variant="outline"
										size="sm"
										disabled={!canEditDetails}
										onClick={() => openEdit(member)}
									>
										Editar
									</Button>
									<Button
										type="button"
										variant="destructive"
										size="sm"
										disabled={!canEditDetails}
										onClick={() => openDelete(member)}
									>
										Eliminar
									</Button>
								</div>
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>

			<Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
				<DialogContent className="max-w-2xl">
					<DialogHeader>
						<DialogTitle>Agregar socio</DialogTitle>
					</DialogHeader>
					<MemberForm draft={draft} updateDraft={updateDraft} />
					<DialogFooter>
						<Button type="button" onClick={createMember}>
							Agregar
						</Button>
						<Button
							type="button"
							variant="outline"
							onClick={() => setIsCreateOpen(false)}
						>
							Cancelar
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
				<DialogContent className="max-w-2xl">
					<DialogHeader>
						<DialogTitle>Editar socio</DialogTitle>
					</DialogHeader>
					<MemberForm draft={draft} updateDraft={updateDraft} />
					<DialogFooter>
						<Button type="button" onClick={saveMember}>
							Guardar
						</Button>
						<Button
							type="button"
							variant="outline"
							onClick={() => setIsEditOpen(false)}
						>
							Cancelar
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Eliminar socio</DialogTitle>
					</DialogHeader>
					<p className="text-muted-foreground text-sm">
						Se eliminara a {activeMember?.nombre_de_socio ?? 'este socio'} del
						listado local.
					</p>
					<DialogFooter>
						<Button type="button" variant="destructive" onClick={removeMember}>
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

function MemberForm({ draft, updateDraft }: { draft: any; updateDraft: any }) {
	return (
		<FieldGroup className="grid gap-4 md:grid-cols-2">
			<Field>
				<FieldLabel htmlFor="member_nombre">Nombre</FieldLabel>
				<Input
					id="member_nombre"
					value={draft.nombre_de_socio ?? ''}
					onChange={(e) => updateDraft('nombre_de_socio')(e.target.value)}
				/>
			</Field>
			<Field>
				<FieldLabel htmlFor="member_correo">Correo</FieldLabel>
				<Input
					id="member_correo"
					type="email"
					value={draft.correo ?? ''}
					onChange={(e) => updateDraft('correo')(e.target.value)}
				/>
			</Field>
			<Field>
				<FieldLabel htmlFor="member_tipo">Tipo</FieldLabel>
				<Input
					id="member_tipo"
					value={draft.tipo_de_socio ?? ''}
					onChange={(e) => updateDraft('tipo_de_socio')(e.target.value)}
				/>
			</Field>
			<Field>
				<FieldLabel htmlFor="member_porcentaje">Porcentaje</FieldLabel>
				<Input
					id="member_porcentaje"
					type="number"
					value={draft.porcentaje ?? ''}
					onChange={(e) =>
						updateDraft('porcentaje')(
							e.target.value === '' ? null : Number(e.target.value),
						)
					}
				/>
			</Field>
			<Field>
				<FieldLabel htmlFor="member_pais">Pais</FieldLabel>
				<Input
					id="member_pais"
					value={draft.pais_de_nacionalidad ?? ''}
					onChange={(e) => updateDraft('pais_de_nacionalidad')(e.target.value)}
				/>
			</Field>
			<Field>
				<FieldLabel htmlFor="member_estado_civil">Estado civil</FieldLabel>
				<Input
					id="member_estado_civil"
					value={draft.estado_civil ?? ''}
					onChange={(e) => updateDraft('estado_civil')(e.target.value)}
				/>
			</Field>
			<Field>
				<FieldLabel htmlFor="member_residente">Residente fiscal</FieldLabel>
				<Select
					value={draft.residente_fiscal ?? ''}
					onValueChange={(value) => updateDraft('residente_fiscal')(value)}
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
		</FieldGroup>
	);
}
