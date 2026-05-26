import * as React from 'react';
import { toast } from 'sonner';

export type MemberAddressType = 'tax' | 'residence' | 'mailing' | 'other';

export interface MemberAddressItem {
	id: number;
	member_id: string;
	type: MemberAddressType;
	line1: string;
	line2: string | null;
	city: string | null;
	state_id: number | null;
	state: string | null;
	country_id: number | null;
	zip: string | null;
	is_primary: boolean;
	deleted_at: string | null;
}

export interface MemberAddressDraft {
	id?: number;
	type: MemberAddressType;
	line1: string;
	line2: string;
	city: string;
	state: string;
	state_id: number | null;
	country_id: number | null;
	zip: string;
	is_primary: boolean;
}

const emptyAddressDraft: MemberAddressDraft = {
	type: 'tax',
	line1: '',
	line2: '',
	city: '',
	state: '',
	state_id: null,
	country_id: null,
	zip: '',
	is_primary: false,
};

const toDraft = (address: MemberAddressItem): MemberAddressDraft => ({
	id: address.id,
	type: address.type,
	line1: address.line1,
	line2: address.line2 ?? '',
	city: address.city ?? '',
	state: address.state ?? '',
	state_id: address.state_id,
	country_id: address.country_id,
	zip: address.zip ?? '',
	is_primary: address.is_primary,
});

const requestJson = async <T>(
	url: string,
	init: RequestInit,
): Promise<T> => {
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
		throw new Error(payload?.error ?? 'No se pudo completar la operación');
	}
	return payload.data as T;
};

/**
 * Hook para gestionar las direcciones de una persona (member). Las direcciones
 * se comparten entre todas las empresas a las que pertenece.
 */
export function useMemberAddresses(memberId: string | null) {
	const [addresses, setAddresses] = React.useState<MemberAddressItem[]>([]);
	const [isLoading, setIsLoading] = React.useState(false);
	const [isSaving, setIsSaving] = React.useState(false);

	const [draft, setDraft] = React.useState<MemberAddressDraft>(emptyAddressDraft);
	const [isFormOpen, setIsFormOpen] = React.useState(false);
	const [isEditing, setIsEditing] = React.useState(false);

	const fetchAddresses = React.useCallback(async () => {
		if (!memberId) {
			setAddresses([]);
			return;
		}
		setIsLoading(true);
		try {
			const data = await requestJson<MemberAddressItem[]>(
				`/api/members/${memberId}/addresses`,
				{ method: 'GET' },
			);
			setAddresses(data);
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : 'No se pudieron cargar las direcciones',
			);
			setAddresses([]);
		} finally {
			setIsLoading(false);
		}
	}, [memberId]);

	React.useEffect(() => {
		void fetchAddresses();
	}, [fetchAddresses]);

	const updateDraft =
		<K extends keyof MemberAddressDraft>(field: K) =>
		(value: MemberAddressDraft[K]) => {
			setDraft((prev) => ({ ...prev, [field]: value }));
		};

	const openCreate = () => {
		setDraft(emptyAddressDraft);
		setIsEditing(false);
		setIsFormOpen(true);
	};

	const openEdit = (address: MemberAddressItem) => {
		setDraft(toDraft(address));
		setIsEditing(true);
		setIsFormOpen(true);
	};

	const submit = async () => {
		if (!memberId) return;
		setIsSaving(true);
		const toastId = toast.loading(
			isEditing ? 'Guardando dirección...' : 'Agregando dirección...',
		);
		try {
			if (isEditing && draft.id) {
				const updated = await requestJson<MemberAddressItem>(
					`/api/members/${memberId}/addresses/${draft.id}`,
					{ method: 'PATCH', body: JSON.stringify(draft) },
				);
				setAddresses((prev) =>
					prev.map((addr) => (addr.id === updated.id ? updated : addr)),
				);
				// Si esta marcó is_primary, sincronizar las demás del mismo tipo
				if (updated.is_primary) {
					setAddresses((prev) =>
						prev.map((addr) =>
							addr.id !== updated.id && addr.type === updated.type
								? { ...addr, is_primary: false }
								: addr,
						),
					);
				}
				toast.success('Dirección actualizada', { id: toastId });
			} else {
				const created = await requestJson<MemberAddressItem>(
					`/api/members/${memberId}/addresses`,
					{ method: 'POST', body: JSON.stringify(draft) },
				);
				setAddresses((prev) => {
					const next = created.is_primary
						? prev.map((addr) =>
								addr.type === created.type ? { ...addr, is_primary: false } : addr,
							)
						: prev;
					return [created, ...next];
				});
				toast.success('Dirección agregada', { id: toastId });
			}
			setIsFormOpen(false);
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : 'Error inesperado',
				{ id: toastId },
			);
		} finally {
			setIsSaving(false);
		}
	};

	const remove = async (addressId: number) => {
		if (!memberId) return;
		setIsSaving(true);
		const toastId = toast.loading('Eliminando dirección...');
		try {
			await requestJson(
				`/api/members/${memberId}/addresses/${addressId}`,
				{ method: 'DELETE', body: JSON.stringify({ reason: null }) },
			);
			setAddresses((prev) => prev.filter((addr) => addr.id !== addressId));
			toast.success('Dirección eliminada', { id: toastId });
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : 'Error inesperado',
				{ id: toastId },
			);
		} finally {
			setIsSaving(false);
		}
	};

	return {
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
		refetch: fetchAddresses,
	};
}
