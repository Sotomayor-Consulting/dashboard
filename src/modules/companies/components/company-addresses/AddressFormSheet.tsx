import { Button } from '@components/ui/Button';
import {
	Sheet,
	SheetContent,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from '@components/ui/Sheet';
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
import { Icon } from '@iconify/react';

import { useLocations } from '../../hooks/use-locations';
import type {
	AddressDraft,
	AddressItem,
} from '../../hooks/use-company-addresses';
import { ComboboxField } from '../../islands/company-details/components/ComboboxField';

interface Props {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	mode: 'create' | 'edit';
	draft: AddressDraft;
	handleDraftChange: (
		field: keyof AddressDraft,
	) => (event: React.ChangeEvent<HTMLInputElement>) => void;
	handleTypeChange: (value: string) => void;
	handleCountryChange: (countryId: number | null) => void;
	handleStateChange: (stateId: number | null) => void;
	selectedAddress?: AddressItem | undefined;
	onSubmit: () => void;
	onDelete?: () => void;
	isSaving: boolean;
}

const TYPE_OPTIONS = [
	{ value: 'operativa', label: 'Operativa' },
	{ value: 'legal', label: 'Legal / Registered Agent' },
	{ value: 'fiscal', label: 'Fiscal / Mailing' },
	{ value: 'other', label: 'Otra' },
];

export default function AddressFormSheet({
	open,
	onOpenChange,
	mode,
	draft,
	handleDraftChange,
	handleTypeChange,
	handleCountryChange,
	handleStateChange,
	selectedAddress,
	onSubmit,
	onDelete,
	isSaving,
}: Props) {
	const isEdit = mode === 'edit';
	const title = isEdit ? 'Editar dirección' : 'Nueva dirección';
	const description = isEdit
		? 'Actualiza los datos de esta dirección.'
		: 'Completa los datos para registrar una nueva dirección.';
	const submitLabel = isEdit ? 'Guardar cambios' : 'Agregar dirección';

	const { countries, states, isLoadingCountries, isLoadingStates } =
		useLocations(draft.country_id);

	const countryOptions = countries.map((c) => ({
		value: String(c.id),
		label: c.name ?? `País ${c.id}`,
		searchText: c.iso ?? '',
	}));
	const stateOptions = states.map((s) => ({
		value: String(s.id),
		label: s.name ?? `Estado ${s.id}`,
		searchText: s.code ?? '',
	}));

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent
				side="right"
				className="max-h-dvh w-full max-w-[560px] overflow-y-auto sm:max-w-2xl"
			>
				<SheetHeader className="pb-3">
					<SheetTitle>{title}</SheetTitle>
					<p className="text-muted-foreground text-sm">{description}</p>
				</SheetHeader>

				<div className="flex flex-col gap-4 px-4 pb-4">
					<FieldGroup className="grid gap-4 md:grid-cols-2">
						<Field className="md:col-span-2">
							<FieldLabel htmlFor="address_type">Tipo *</FieldLabel>
							<Select
								value={draft.type || ''}
								onValueChange={(value) => handleTypeChange(value ?? '')}
							>
								<SelectTrigger id="address_type" className="w-full">
									<SelectValue placeholder="Selecciona el tipo de dirección" />
								</SelectTrigger>
								<SelectContent>
									<SelectGroup>
										{TYPE_OPTIONS.map((opt) => (
											<SelectItem key={opt.value} value={opt.value}>
												{opt.label}
											</SelectItem>
										))}
									</SelectGroup>
								</SelectContent>
							</Select>
						</Field>

						<Field className="md:col-span-2">
							<FieldLabel htmlFor="address_line1">Dirección *</FieldLabel>
							<Input
								id="address_line1"
								value={draft.line1}
								onChange={handleDraftChange('line1')}
								placeholder="Ej: 123 Main St"
							/>
						</Field>

						<Field className="md:col-span-2">
							<FieldLabel htmlFor="address_line2">Línea 2</FieldLabel>
							<Input
								id="address_line2"
								value={draft.line2}
								onChange={handleDraftChange('line2')}
								placeholder="Apt, Suite, Piso..."
							/>
						</Field>

						{/* País + Estado en cascada */}
						<Field>
							<FieldLabel htmlFor="address_country">País *</FieldLabel>
							<ComboboxField
								id="address_country"
								options={countryOptions}
								value={draft.country_id === null ? null : String(draft.country_id)}
								onChange={(value) =>
									handleCountryChange(value === null ? null : Number(value))
								}
								placeholder={
									isLoadingCountries ? 'Cargando…' : 'Seleccione el país'
								}
								disabled={isLoadingCountries}
								allowClear
							/>
						</Field>

						<Field>
							<FieldLabel htmlFor="address_state">Estado / Provincia</FieldLabel>
							<ComboboxField
								id="address_state"
								options={stateOptions}
								value={draft.state_id === null ? null : String(draft.state_id)}
								onChange={(value) =>
									handleStateChange(value === null ? null : Number(value))
								}
								placeholder={
									draft.country_id === null
										? 'Primero selecciona país'
										: isLoadingStates
											? 'Cargando estados…'
											: stateOptions.length === 0
												? 'Sin estados disponibles'
												: 'Seleccione estado'
								}
								disabled={draft.country_id === null || isLoadingStates}
								allowClear
							/>
						</Field>

						<Field>
							<FieldLabel htmlFor="address_city">Ciudad *</FieldLabel>
							<Input
								id="address_city"
								value={draft.city}
								onChange={handleDraftChange('city')}
							/>
						</Field>

						<Field>
							<FieldLabel htmlFor="address_county">Condado</FieldLabel>
							<Input
								id="address_county"
								value={draft.county}
								onChange={handleDraftChange('county')}
							/>
						</Field>

						<Field className="md:col-span-2">
							<FieldLabel htmlFor="address_zip">ZIP</FieldLabel>
							<Input
								id="address_zip"
								value={draft.zip}
								onChange={handleDraftChange('zip')}
							/>
						</Field>
					</FieldGroup>
				</div>

				<SheetFooter className="flex-row items-center justify-between">
					{isEdit && onDelete ? (
						<Button
							type="button"
							variant="ghost"
							onClick={onDelete}
							disabled={isSaving || !selectedAddress}
							className="text-destructive hover:text-destructive"
						>
							<Icon icon="ri:delete-bin-line" className="size-4" />
							Eliminar
						</Button>
					) : (
						<span />
					)}
					<div className="flex items-center gap-2">
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
							disabled={isSaving}
						>
							Cancelar
						</Button>
						<Button type="button" onClick={onSubmit} disabled={isSaving}>
							{isSaving ? 'Guardando...' : submitLabel}
						</Button>
					</div>
				</SheetFooter>
			</SheetContent>
		</Sheet>
	);
}
