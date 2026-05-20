import * as React from 'react';
import type { CompanyMemberItem } from '../types';

type TaxAddressDraft = {
	line1: string;
	line2: string;
	city: string;
	state: string;
	zip: string;
};

export type CompanyMemberDraft = {
	full_name: string;
	email: string;
	member_type: string;
	percentage: number | null;
	is_member: boolean;
	is_manager: boolean;
	is_us_tax_resident: boolean | null;
	passport_number: string;
	ssn: string;
	itin: string;
	tax_address: TaxAddressDraft;
};

const emptyDraft: CompanyMemberDraft = {
	full_name: '',
	email: '',
	member_type: '',
	percentage: null,
	is_member: true,
	is_manager: false,
	is_us_tax_resident: null,
	passport_number: '',
	ssn: '',
	itin: '',
	tax_address: {
		line1: '',
		line2: '',
		city: '',
		state: '',
		zip: '',
	},
};

const toDraft = (member: CompanyMemberItem): CompanyMemberDraft => ({
	full_name: member.full_name ?? '',
	email: member.email ?? '',
	member_type: member.member_type ?? '',
	percentage: member.percentage ?? null,
	is_member: member.is_member ?? true,
	is_manager: member.is_manager ?? false,
	is_us_tax_resident: member.is_us_tax_resident,
	passport_number: member.passport_number ?? '',
	ssn: member.ssn ?? '',
	itin: member.itin ?? '',
	tax_address: {
		line1: member.tax_address?.line1 ?? '',
		line2: member.tax_address?.line2 ?? '',
		city: member.tax_address?.city ?? '',
		state: member.tax_address?.state ?? '',
		zip: member.tax_address?.zip ?? '',
	},
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
		throw new Error(payload?.error ?? 'No se pudo guardar el cambio');
	}
	return payload.data as T;
};

export function useCompanyMembersCrud(
	initialMembers: CompanyMemberItem[],
	incorporationId: string,
) {
	const [members, setMembers] =
		React.useState<CompanyMemberItem[]>(initialMembers);
	const [isCreateOpen, setIsCreateOpen] = React.useState(false);
	const [isEditOpen, setIsEditOpen] = React.useState(false);
	const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);
	const [activeMember, setActiveMember] =
		React.useState<CompanyMemberItem | null>(null);
	const [draft, setDraft] = React.useState<CompanyMemberDraft>(emptyDraft);
	const [isSaving, setIsSaving] = React.useState(false);

	React.useEffect(() => {
		setMembers(initialMembers);
	}, [initialMembers]);

	const updateDraft =
		<K extends keyof CompanyMemberDraft>(field: K) =>
		(value: CompanyMemberDraft[K]) => {
			setDraft((prev) => ({ ...prev, [field]: value }));
		};

	const updateTaxAddress =
		<K extends keyof TaxAddressDraft>(field: K) =>
		(value: TaxAddressDraft[K]) => {
			setDraft((prev) => ({
				...prev,
				tax_address: {
					...prev.tax_address,
					[field]: value,
				},
			}));
		};

	const openCreate = () => {
		setDraft(emptyDraft);
		setIsCreateOpen(true);
	};

	const openEdit = (member: CompanyMemberItem) => {
		setActiveMember(member);
		setDraft(toDraft(member));
		setIsEditOpen(true);
	};

	const openDelete = (member: CompanyMemberItem) => {
		setActiveMember(member);
		setIsDeleteOpen(true);
	};

	const createMember = async () => {
		setIsSaving(true);
		try {
			const created = await requestJson<CompanyMemberItem>(
				`/api/incorporations/${incorporationId}/members`,
				{
					method: 'POST',
					body: JSON.stringify(draft),
				},
			);
			setMembers((prev) => [created, ...prev]);
			setIsCreateOpen(false);
		} catch (error) {
			window.alert(error instanceof Error ? error.message : 'Error inesperado');
		} finally {
			setIsSaving(false);
		}
	};

	const saveMember = async () => {
		if (!activeMember) return;
		setIsSaving(true);
		try {
			const updated = await requestJson<CompanyMemberItem>(
				`/api/incorporations/${incorporationId}/members/${activeMember.id}`,
				{
					method: 'PATCH',
					body: JSON.stringify(draft),
				},
			);
			setMembers((prev) =>
				prev.map((member) => (member.id === updated.id ? updated : member)),
			);
			setIsEditOpen(false);
		} catch (error) {
			window.alert(error instanceof Error ? error.message : 'Error inesperado');
		} finally {
			setIsSaving(false);
		}
	};

	const removeMember = async () => {
		if (!activeMember) return;
		setIsSaving(true);
		try {
			await requestJson<CompanyMemberItem>(
				`/api/incorporations/${incorporationId}/members/${activeMember.id}`,
				{
					method: 'DELETE',
					body: JSON.stringify({ reason: 'Eliminado desde Editar Datos' }),
				},
			);
			setMembers((prev) =>
				prev.filter((member) => member.id !== activeMember.id),
			);
			setIsDeleteOpen(false);
		} catch (error) {
			window.alert(error instanceof Error ? error.message : 'Error inesperado');
		} finally {
			setIsSaving(false);
		}
	};

	return {
		members,
		activeMember,
		draft,
		isSaving,
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
		updateTaxAddress,
		createMember,
		saveMember,
		removeMember,
	};
}
