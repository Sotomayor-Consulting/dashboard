import * as React from 'react';
import type { CompanyAddressItem } from '../types';

export type AddressItem = CompanyAddressItem;

export type AddressDraft = {
	type: string;
	country: string;
	city: string;
	line1: string;
	line2: string;
	county: string;
	zip: string;
};

const emptyDraft: AddressDraft = {
	type: '',
	country: '',
	city: '',
	line1: '',
	line2: '',
	county: '',
	zip: '',
};

const toDraft = (address: AddressItem): AddressDraft => ({
	type: address.type ?? '',
	country: address.country ?? '',
	city: address.city ?? '',
	line1: address.line1 ?? '',
	line2: address.line2 ?? '',
	county: address.county ?? '',
	zip: address.zip ?? '',
});

const requestJson = async <T>(url: string, init: RequestInit): Promise<T> => {
	const response = await fetch(url, {
		...init,
		headers: {
			'Content-Type': 'application/json',
			...(init.headers ?? {}),
		},
	});
	const payload = await response.json().catch(() => null);
	if (!response.ok || !payload?.ok) {
		throw new Error(payload?.error ?? 'No se pudo guardar la direccion');
	}
	return payload.data as T;
};

export function useCompanyAddresses(
	initialAddresses: CompanyAddressItem[],
	incorporationId: string,
) {
	const [addresses, setAddresses] =
		React.useState<AddressItem[]>(initialAddresses);
	const [selectedAddressId, setSelectedAddressId] = React.useState<number | null>(
		initialAddresses[0]?.id ?? null,
	);
	const [isDetailModalOpen, setIsDetailModalOpen] = React.useState(false);
	const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
	const [draft, setDraft] = React.useState<AddressDraft>(emptyDraft);
	const [isSaving, setIsSaving] = React.useState(false);

	React.useEffect(() => {
		setAddresses(initialAddresses);
		setSelectedAddressId(initialAddresses[0]?.id ?? null);
	}, [initialAddresses]);

	const selectedAddress = addresses.find(
		(address) => address.id === selectedAddressId,
	);

	const openAddressDetail = (addressId: number) => {
		const address = addresses.find((item) => item.id === addressId);
		if (!address) return;
		setSelectedAddressId(addressId);
		setDraft(toDraft(address));
		setIsDetailModalOpen(true);
	};

	const openCreateAddress = () => {
		setDraft(emptyDraft);
		setIsAddModalOpen(true);
	};

	const handleDraftChange =
		(field: keyof AddressDraft) =>
		(event: React.ChangeEvent<HTMLInputElement>) => {
			setDraft((prev) => ({
				...prev,
				[field]: event.target.value,
			}));
		};

	const handleAddAddress = async () => {
		setIsSaving(true);
		try {
			const created = await requestJson<AddressItem>(
				`/api/incorporations/${incorporationId}/addresses`,
				{
					method: 'POST',
					body: JSON.stringify(draft),
				},
			);
			setAddresses((prev) => [...prev, created]);
			setIsAddModalOpen(false);
		} catch (error) {
			window.alert(error instanceof Error ? error.message : 'Error inesperado');
		} finally {
			setIsSaving(false);
		}
	};

	const handleSaveAddress = async () => {
		if (!selectedAddress) return;
		setIsSaving(true);
		try {
			const updated = await requestJson<AddressItem>(
				`/api/incorporations/${incorporationId}/addresses/${selectedAddress.id}`,
				{
					method: 'PATCH',
					body: JSON.stringify(draft),
				},
			);
			setAddresses((prev) =>
				prev.map((address) =>
					address.id === updated.id ? updated : address,
				),
			);
			setIsDetailModalOpen(false);
		} catch (error) {
			window.alert(error instanceof Error ? error.message : 'Error inesperado');
		} finally {
			setIsSaving(false);
		}
	};

	const handleDeleteAddress = async () => {
		if (!selectedAddress) return;
		setIsSaving(true);
		try {
			await requestJson<AddressItem>(
				`/api/incorporations/${incorporationId}/addresses/${selectedAddress.id}`,
				{
					method: 'DELETE',
					body: JSON.stringify({ reason: 'Eliminada desde Editar Datos' }),
				},
			);
			setAddresses((prev) =>
				prev.filter((address) => address.id !== selectedAddress.id),
			);
			setIsDetailModalOpen(false);
		} catch (error) {
			window.alert(error instanceof Error ? error.message : 'Error inesperado');
		} finally {
			setIsSaving(false);
		}
	};

	return {
		addresses,
		selectedAddress,
		isSaving,
		isDetailModalOpen,
		setIsDetailModalOpen,
		isAddModalOpen,
		setIsAddModalOpen,
		newAddress: draft,
		handleNewAddressChange: handleDraftChange,
		handleAddAddress,
		handleSaveAddress,
		handleDeleteAddress,
		openAddressDetail,
		openCreateAddress,
		addressCardHeightClass: 'min-h-56',
	};
}
