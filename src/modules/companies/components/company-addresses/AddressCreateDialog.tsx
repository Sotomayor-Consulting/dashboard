import * as React from 'react';
import { Button } from '@components/ui/Button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@components/ui/Dialog';
import { Field, FieldGroup, FieldLabel } from '@components/ui/Field';
import { Input } from '@components/ui/Input';
import type { AddressItem } from '../../hooks/use-company-addresses';

interface Props {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	newAddress: Omit<AddressItem, 'id'>;
	handleNewAddressChange: (
		field: keyof Omit<AddressItem, 'id'>,
	) => (event: React.ChangeEvent<HTMLInputElement>) => void;
	handleAddAddress: () => void;
}

export default function AddressCreateDialog({
	open,
	onOpenChange,
	newAddress,
	handleNewAddressChange,
	handleAddAddress,
}: Props) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="">
				<DialogHeader>
					<DialogTitle>Nueva direccion</DialogTitle>
					<DialogDescription>
						Completa los datos para agregar una nueva direccion.
					</DialogDescription>
				</DialogHeader>
				<FieldGroup className="grid gap-4 md:grid-cols-2">
					<Field>
						<FieldLabel htmlFor="new_address_type">Tipo</FieldLabel>
						<Input
							id="new_address_type"
							value={newAddress.type}
							onChange={handleNewAddressChange('type')}
						/>
					</Field>
					<Field>
						<FieldLabel htmlFor="new_address_country">Pais</FieldLabel>
						<Input
							id="new_address_country"
							value={newAddress.country}
							onChange={handleNewAddressChange('country')}
						/>
					</Field>
					<Field>
						<FieldLabel htmlFor="new_address_city">Ciudad</FieldLabel>
						<Input
							id="new_address_city"
							value={newAddress.city}
							onChange={handleNewAddressChange('city')}
						/>
					</Field>
					<Field>
						<FieldLabel htmlFor="new_address_zip">ZIP</FieldLabel>
						<Input
							id="new_address_zip"
							value={newAddress.zip}
							onChange={handleNewAddressChange('zip')}
						/>
					</Field>
					<Field className="md:col-span-2">
						<FieldLabel htmlFor="new_address_line1">Linea 1</FieldLabel>
						<Input
							id="new_address_line1"
							value={newAddress.line1}
							onChange={handleNewAddressChange('line1')}
						/>
					</Field>
				</FieldGroup>
				<DialogFooter>
					<Button type="button" onClick={handleAddAddress}>
						Agregar
					</Button>
					<Button
						type="button"
						variant="outline"
						onClick={() => onOpenChange(false)}
					>
						Cancelar
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
