import * as React from 'react';
import { Button } from '@components/ui/Button';
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from '@components/ui/Card';
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@components/ui/Dialog';
import { Field, FieldGroup, FieldLabel } from '@components/ui/Field';
import { Input } from '@components/ui/Input';
import { PlusIcon } from 'lucide-react';
import type { AddressItem } from '../hooks/use-company-addresses';

interface Props {
	canEditDetails: boolean;
	addresses: AddressItem[];
	selectedAddress: AddressItem | undefined;
	isDetailModalOpen: boolean;
	setIsDetailModalOpen: (open: boolean) => void;
	isAddModalOpen: boolean;
	setIsAddModalOpen: (open: boolean) => void;
	newAddress: Omit<AddressItem, 'id'>;
	handleNewAddressChange: (
		field: keyof Omit<AddressItem, 'id'>,
	) => (event: React.ChangeEvent<HTMLInputElement>) => void;
	handleAddAddress: () => void;
	openAddressDetail: (addressId: string) => void;
	addressCardHeightClass: string;
}

export default function CompanyAddressesSection({
	canEditDetails,
	addresses,
	selectedAddress,
	isDetailModalOpen,
	setIsDetailModalOpen,
	isAddModalOpen,
	setIsAddModalOpen,
	newAddress,
	handleNewAddressChange,
	handleAddAddress,
	openAddressDetail,
	addressCardHeightClass,
}: Props) {
	return (
		<div className="flex flex-col gap-4">
			<div className="flex items-center justify-between">
				<h3 className="text-sm font-semibold">Direcciones</h3>
			</div>

			<div className="grid grid-cols-1 items-start gap-4 md:grid-cols-3">
				{addresses.map((address) => (
					<Card
						color="brand"
						key={address.id}
						className={`gap-0 ${addressCardHeightClass}`}
					>
						<CardHeader className="px-4 pt-4 pb-2">
							<CardTitle>{address.type || 'Sin tipo'}</CardTitle>
						</CardHeader>
						<CardContent className="flex-1 px-4 pt-0 pb-4">
							<div className="flex flex-col gap-1 text-sm">
								<p className="text-muted-foreground">
									{address.line1 || 'Sin linea 1'}
								</p>
								<p className="text-muted-foreground">
									{address.city || 'Sin ciudad'}
									{address.zip ? `, ${address.zip}` : ''}
									{address.country ? `, ${address.country}` : ''}
								</p>
							</div>
						</CardContent>
						<CardFooter className="mt-auto rounded-none border-t px-4 py-3">
							<Button
								type="button"
								variant="link"
								className="h-auto p-0"
								onClick={() => openAddressDetail(address.id)}
							>
								Editar
							</Button>
						</CardFooter>
					</Card>
				))}
				<Card color="brand" className={`gap-0 ${addressCardHeightClass}`}>
					<CardContent className="flex h-full flex-1 flex-col items-center justify-center gap-3 p-5 text-center">
						<button
							type="button"
							onClick={() => setIsAddModalOpen(true)}
							disabled={!canEditDetails}
							className="bg-muted hover:bg-muted/80 flex size-12 items-center justify-center rounded-full transition-colors disabled:opacity-50"
						>
							<PlusIcon className="text-muted-foreground" />
						</button>
						<p className="text-sm font-semibold">Agregar nueva direccion</p>
						<p className="text-muted-foreground text-sm">
							Registra tipo, pais, ciudad, linea 1 y ZIP
						</p>
					</CardContent>
				</Card>
			</div>

			<Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
				<DialogContent className="max-w-xl">
					<DialogHeader>
						<DialogTitle>Detalle de direccion</DialogTitle>
					</DialogHeader>
					<FieldGroup className="grid gap-4 md:grid-cols-2">
						<Field>
							<FieldLabel>Tipo</FieldLabel>
							<Input value={selectedAddress?.type ?? ''} disabled />
						</Field>
						<Field>
							<FieldLabel>Pais</FieldLabel>
							<Input value={selectedAddress?.country ?? ''} disabled />
						</Field>
						<Field>
							<FieldLabel>Ciudad</FieldLabel>
							<Input value={selectedAddress?.city ?? ''} disabled />
						</Field>
						<Field>
							<FieldLabel>ZIP</FieldLabel>
							<Input value={selectedAddress?.zip ?? ''} disabled />
						</Field>
						<Field className="md:col-span-2">
							<FieldLabel>Linea 1</FieldLabel>
							<Input value={selectedAddress?.line1 ?? ''} disabled />
						</Field>
					</FieldGroup>
					<DialogFooter>
						<Button type="button">Guardar</Button>
						<Button
							type="button"
							variant="outline"
							onClick={() => setIsDetailModalOpen(false)}
						>
							Cerrar
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
				<DialogContent className="max-w-xl">
					<DialogHeader>
						<DialogTitle>Nueva direccion</DialogTitle>
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
							onClick={() => setIsAddModalOpen(false)}
						>
							Cancelar
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
