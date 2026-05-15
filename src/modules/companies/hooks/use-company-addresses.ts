import * as React from 'react';
import type { EmpresaDetail } from '../types';

export interface AddressItem {
	id: string;
	type: string;
	country: string;
	city: string;
	line1: string;
	zip: string;
}

const hasAddressContent = (address: Omit<AddressItem, 'id'>) =>
	Boolean(
		address.type.trim() ||
			address.country.trim() ||
			address.city.trim() ||
			address.line1.trim() ||
			address.zip.trim(),
	);

export function useCompanyAddresses(empresa: EmpresaDetail) {
	const initialAddress: Omit<AddressItem, 'id'> = {
		type: empresa.direccion_operativa_eeuu ?? '',
		country: empresa.Pais_operativo ?? '',
		city: empresa.ciudad_eeuu ?? '',
		line1: empresa.direccion_eeuu ?? '',
		zip: empresa.codigo_postal_eeuu ?? '',
	};

	const [addresses, setAddresses] = React.useState<AddressItem[]>(
		hasAddressContent(initialAddress)
			? [{ id: 'addr-1', ...initialAddress }]
			: [
					{
						id: 'addr-demo',
						type: 'Operativa',
						country: 'United States',
						city: 'Miami',
						line1: '1201 Brickell Ave',
						zip: '33131',
					},
				],
	);

	const [selectedAddressId, setSelectedAddressId] = React.useState<string | null>(
		addresses[0]?.id ?? null,
	);
	const [isDetailModalOpen, setIsDetailModalOpen] = React.useState(false);
	const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
	const [newAddress, setNewAddress] = React.useState<Omit<AddressItem, 'id'>>({
		type: '',
		country: '',
		city: '',
		line1: '',
		zip: '',
	});

	const selectedAddress = addresses.find(
		(address) => address.id === selectedAddressId,
	);

	const openAddressDetail = (addressId: string) => {
		setSelectedAddressId(addressId);
		setIsDetailModalOpen(true);
	};

	const handleNewAddressChange =
		(field: keyof Omit<AddressItem, 'id'>) =>
		(event: React.ChangeEvent<HTMLInputElement>) => {
			setNewAddress((prev) => ({
				...prev,
				[field]: event.target.value,
			}));
		};

	const handleAddAddress = () => {
		if (!hasAddressContent(newAddress)) return;

		const address: AddressItem = {
			id: `addr-${Date.now()}`,
			type: newAddress.type.trim(),
			country: newAddress.country.trim(),
			city: newAddress.city.trim(),
			line1: newAddress.line1.trim(),
			zip: newAddress.zip.trim(),
		};

		setAddresses((prev) => [...prev, address]);
		setNewAddress({ type: '', country: '', city: '', line1: '', zip: '' });
		setIsAddModalOpen(false);
	};

	return {
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
		addressCardHeightClass: 'min-h-56',
	};
}
