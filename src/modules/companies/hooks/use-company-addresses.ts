import * as React from 'react';
import { toast } from 'sonner';
import { companyAddressSchema } from '../schemas/company-address.schema';
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
		credentials: 'include',
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
	companyId: string | null,
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

	const handleAddressTypeChange = (value: string) => {
		setDraft((prev) => ({ ...prev, type: value }));
	};

	const handleAddAddress = async () => {
		if (!companyId) {
			toast.error('Primero debes crear la empresa para agregar direcciones.');
			return;
		}

		const parsed = companyAddressSchema.safeParse(draft);
		if (!parsed.success) {
			const firstError = parsed.error.issues[0]?.message ?? 'Datos inválidos';
			toast.error(firstError);
			return;
		}

		setIsSaving(true);
		const loadingToastId = toast.loading('Agregando direccion...');
		try {
			const created = await requestJson<AddressItem>(
				`/api/companies/${companyId}/addresses`,
				{
					method: 'POST',
					body: JSON.stringify(parsed.data),
				},
			);
			setAddresses((prev) => [...prev, created]);
			setIsAddModalOpen(false);
			toast.success('Direccion agregada', { id: loadingToastId });
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : 'Error inesperado',
				{ id: loadingToastId },
			);
		} finally {
			setIsSaving(false);
		}
	};

	const handleSaveAddress = async () => {
		if (!selectedAddress || !companyId) return;

		const parsed = companyAddressSchema.safeParse(draft);
		if (!parsed.success) {
			const firstError = parsed.error.issues[0]?.message ?? 'Datos inválidos';
			toast.error(firstError);
			return;
		}

		setIsSaving(true);
		const loadingToastId = toast.loading('Guardando direccion...');
		try {
			const updated = await requestJson<AddressItem>(
				`/api/companies/${companyId}/addresses/${selectedAddress.id}`,
				{
					method: 'PATCH',
					body: JSON.stringify(parsed.data),
				},
			);
			setAddresses((prev) =>
				prev.map((address) =>
					address.id === updated.id ? updated : address,
				),
			);
			setIsDetailModalOpen(false);
			toast.success('Direccion actualizada', { id: loadingToastId });
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : 'Error inesperado',
				{ id: loadingToastId },
			);
		} finally {
			setIsSaving(false);
		}
	};

	const handleDeleteAddress = async () => {
		if (!selectedAddress || !companyId) return;
		setIsSaving(true);
		const loadingToastId = toast.loading('Eliminando direccion...');
		try {
			await requestJson<AddressItem>(
				`/api/companies/${companyId}/addresses/${selectedAddress.id}`,
				{
					method: 'DELETE',
					body: JSON.stringify({ reason: 'Eliminada desde Editar Datos' }),
				},
			);
			setAddresses((prev) =>
				prev.filter((address) => address.id !== selectedAddress.id),
			);
			setIsDetailModalOpen(false);
			toast.success('Direccion eliminada', { id: loadingToastId });
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : 'Error inesperado',
				{ id: loadingToastId },
			);
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
		handleAddressTypeChange,
		handleAddAddress,
		handleSaveAddress,
		handleDeleteAddress,
		openAddressDetail,
		openCreateAddress,
		addressCardHeightClass: 'min-h-56',
	};
}
