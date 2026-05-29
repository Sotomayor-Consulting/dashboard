import * as React from 'react';
import { Icon } from '@iconify/react';
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
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@components/ui/Select';
import { Switch } from '@components/ui/Switch';
import { cn } from '@components/utils';

import {
	type MemberAddressItem,
	useMemberAddresses,
} from '../hooks/use-member-addresses';

const TYPE_LABEL: Record<string, string> = {
	tax: 'Tributaria',
	residence: 'Residencial',
	mailing: 'Correspondencia',
	other: 'Otra',
};

const TYPE_CLASS: Record<string, string> = {
	tax: 'border border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-400',
	residence:
		'border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-400',
	mailing:
		'border border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900/50 dark:bg-indigo-950/40 dark:text-indigo-300',
	other: 'border border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-700 dark:bg-neutral-900 dark:text-gray-300',
};

interface Props {
	memberId: string | null;
	canEdit: boolean;
}

/**
 * Panel CRUD de direcciones de una persona. Se monta dentro del Dialog
 * "Editar persona". Las direcciones se comparten entre todas las empresas
 * a las que pertenece el member.
 */
export default function MemberAddressesPanel({ memberId, canEdit }: Props) {
	const {
		addresses,
		isLoading,
		isSaving,
		draft,
		isFormOpen,
		setIsFormOpen,
		isEditing,
		openCreate,
		openEdit,
		updateDraft,
		submit,
		remove,
	} = useMemberAddresses(memberId);

	return (
		<section className="flex flex-col gap-3">
			<header className="flex items-center justify-between">
				<div>
					<h4 className="text-sm font-semibold">Direcciones</h4>
					<p className="text-muted-foreground text-[11.5px]">
						Compartidas entre todas las empresas a las que pertenece esta
						persona.
					</p>
				</div>
				<Button
					type="button"
					variant="outline"
					size="sm"
					onClick={openCreate}
					disabled={!canEdit || !memberId}
				>
					<Icon icon="ri:add-line" className="size-4" />
					Agregar
				</Button>
			</header>

			{isLoading ? (
				<div className="rounded-lg border border-dashed border-gray-200 p-4 text-center text-[12px] text-gray-500 dark:border-gray-700">
					Cargando direcciones...
				</div>
			) : addresses.length === 0 ? (
				<div className="rounded-lg border border-dashed border-gray-200 p-4 text-center text-[12px] text-gray-500 dark:border-gray-700">
					Esta persona no tiene direcciones registradas.
				</div>
			) : (
				<div className="grid gap-2 md:grid-cols-2">
					{addresses.map((address) => (
						<AddressCard
							key={address.id}
							address={address}
							canEdit={canEdit}
							disabled={isSaving}
							onEdit={() => openEdit(address)}
							onDelete={() => remove(address.id)}
						/>
					))}
				</div>
			)}

			<Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
				<DialogContent className="max-w-xl">
					<DialogHeader>
						<DialogTitle>
							{isEditing ? 'Editar dirección' : 'Agregar dirección'}
						</DialogTitle>
					</DialogHeader>
					<AddressForm
						draft={draft}
						updateDraft={updateDraft}
					/>
					<DialogFooter>
						<Button
							type="button"
							onClick={submit}
							disabled={isSaving || !draft.line1.trim()}
						>
							{isSaving
								? 'Guardando...'
								: isEditing
									? 'Guardar dirección'
									: 'Agregar dirección'}
						</Button>
						<Button
							type="button"
							variant="outline"
							onClick={() => setIsFormOpen(false)}
						>
							Cancelar
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</section>
	);
}

function AddressCard({
	address,
	canEdit,
	disabled,
	onEdit,
	onDelete,
}: {
	address: MemberAddressItem;
	canEdit: boolean;
	disabled: boolean;
	onEdit: () => void;
	onDelete: () => void;
}) {
	const typeClass = TYPE_CLASS[address.type] ?? TYPE_CLASS.other;
	return (
		<div className="flex flex-col gap-2 rounded-lg border border-gray-200 p-3 dark:border-gray-700">
			<div className="flex items-start justify-between gap-2">
				<div className="flex items-center gap-2">
					<span
						className={cn(
							'inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium',
							typeClass,
						)}
					>
						{TYPE_LABEL[address.type] ?? address.type}
					</span>
					{address.is_primary ? (
						<span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-600 dark:text-amber-400">
							<Icon icon="ri:star-fill" className="size-3" />
							Principal
						</span>
					) : null}
				</div>
				<div className="flex items-center gap-1">
					<button
						type="button"
						onClick={onEdit}
						disabled={!canEdit || disabled}
						className="text-gray-400 transition-colors hover:text-gray-700 disabled:opacity-50 dark:hover:text-gray-200"
						aria-label="Editar dirección"
					>
						<Icon icon="ri:edit-line" className="size-4" />
					</button>
					<button
						type="button"
						onClick={onDelete}
						disabled={!canEdit || disabled}
						className="text-gray-400 transition-colors hover:text-red-600 disabled:opacity-50 dark:hover:text-red-400"
						aria-label="Eliminar dirección"
					>
						<Icon icon="ri:delete-bin-line" className="size-4" />
					</button>
				</div>
			</div>
			<div className="text-[12px] leading-relaxed text-gray-700 dark:text-gray-300">
				<p>{address.line1}</p>
				{address.line2 ? <p>{address.line2}</p> : null}
				<p className="text-gray-500 dark:text-gray-400">
					{[address.city, address.state, address.zip].filter(Boolean).join(', ') ||
						'Sin ciudad/estado/zip'}
				</p>
			</div>
		</div>
	);
}

function AddressForm({
	draft,
	updateDraft,
}: {
	draft: ReturnType<typeof useMemberAddresses>['draft'];
	updateDraft: ReturnType<typeof useMemberAddresses>['updateDraft'];
}) {
	return (
		<FieldGroup className="grid gap-4 md:grid-cols-2">
			<Field>
				<FieldLabel htmlFor="address_type">Tipo</FieldLabel>
				<Select
					value={draft.type}
					onValueChange={(value) =>
						updateDraft('type')(value as typeof draft.type)
					}
				>
					<SelectTrigger id="address_type" className="w-full">
						<SelectValue placeholder="Selecciona el tipo de dirección" />
					</SelectTrigger>
					<SelectContent>
						<SelectGroup>
							<SelectItem value="tax">Tributaria</SelectItem>
							<SelectItem value="residence">Residencial</SelectItem>
							<SelectItem value="mailing">Correspondencia</SelectItem>
							<SelectItem value="other">Otra</SelectItem>
						</SelectGroup>
					</SelectContent>
				</Select>
			</Field>
			<Field>
				<FieldLabel htmlFor="address_zip">ZIP</FieldLabel>
				<Input
					id="address_zip"
					value={draft.zip}
					onChange={(e) => updateDraft('zip')(e.target.value)}
				/>
			</Field>
			<Field className="md:col-span-2">
				<FieldLabel htmlFor="address_line1">Dirección *</FieldLabel>
				<Input
					id="address_line1"
					value={draft.line1}
					onChange={(e) => updateDraft('line1')(e.target.value)}
				/>
			</Field>
			<Field className="md:col-span-2">
				<FieldLabel htmlFor="address_line2">Dirección 2</FieldLabel>
				<Input
					id="address_line2"
					value={draft.line2}
					onChange={(e) => updateDraft('line2')(e.target.value)}
				/>
			</Field>
			<Field>
				<FieldLabel htmlFor="address_city">Ciudad</FieldLabel>
				<Input
					id="address_city"
					value={draft.city}
					onChange={(e) => updateDraft('city')(e.target.value)}
				/>
			</Field>
			<Field>
				<FieldLabel htmlFor="address_state">Estado</FieldLabel>
				<Input
					id="address_state"
					value={draft.state}
					onChange={(e) => updateDraft('state')(e.target.value)}
				/>
			</Field>
			<Field className="md:col-span-2">
				<label className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 p-3 text-sm dark:border-gray-700">
					<div>
						<p className="font-medium">Dirección principal</p>
						<FieldDescription>
							Marcará esta como la principal de su tipo y quitará el flag a las
							demás del mismo tipo.
						</FieldDescription>
					</div>
					<Switch
						checked={draft.is_primary}
						onCheckedChange={(value) => updateDraft('is_primary')(value)}
					/>
				</label>
			</Field>
		</FieldGroup>
	);
}
