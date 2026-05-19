import * as React from 'react';
import { Button } from '@components/ui/Button';
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '@components/ui/Card';
import { cn } from '@components/utils';
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
		<section className="flex flex-col gap-4">
			<header>
				<h3 className="text-sm font-semibold">Direcciones</h3>
			</header>

			<div className="grid auto-rows-fr grid-cols-3 gap-4">
				{addresses.map((address) => (
					<Card
						key={address.id}
						size="sm"
						className={cn('h-full gap-0 p-0', addressCardHeightClass)}
					>
						<CardHeader className="border-b p-0">
							<CardTitle className="truncate">
								{address.type || 'Sin tipo'}
							</CardTitle>
							<CardDescription className="truncate">
								{address.country || 'Sin pais'}
							</CardDescription>
						</CardHeader>
						<CardContent className="flex flex-1 flex-col gap-3 p-3">
							<div className="flex flex-col gap-1">
								<span className="text-muted-foreground text-xs">Linea 1</span>
								<p className="line-clamp-2 text-sm">
									{address.line1 || 'Sin linea 1'}
								</p>
							</div>
							<div className="flex flex-col gap-1">
								<span className="text-muted-foreground text-xs">
									Ciudad y ZIP
								</span>
								<p className="text-sm">
									{address.city || 'Sin ciudad'}
									{address.zip ? `, ${address.zip}` : ''}
								</p>
							</div>
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={() => openAddressDetail(address.id)}
							>
								Ver detalle
							</Button>
						</CardContent>
					</Card>
				))}
				<Button
					size="sm"
					className={cn(
						'round-lg h-full max-h-full min-h-full w-full border-dashed bg-none p-0',
					)}
					background-none
					round-lg
					max-h-full
					min-h-full
					w-full
					type="button"
					variant="outline"
					onClick={() => setIsAddModalOpen(true)}
					disabled={!canEditDetails}
				>
					<PlusIcon data-icon="inline-start" />
					Agregar
				</Button>
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
		</section>
	);
}
