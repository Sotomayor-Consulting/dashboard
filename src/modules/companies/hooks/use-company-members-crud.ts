import * as React from 'react';
import { toast } from 'sonner';
import type {
	CompanyMemberItem,
	MemberIdentificationType,
	MemberItem,
	MemberMaritalStatus,
	MemberPersonType,
} from '../types';

export interface MemberDraft {
	person_type: MemberPersonType;
	first_name: string;
	last_name: string;
	name: string;
	birth_date: string;
	incorporation_date: string;
	identification_type: MemberIdentificationType;
	identification_number: string;
	country_nationality_id: number | null;
	country_residence_id: number | null;
	marital_status: MemberMaritalStatus | '';
	ssn: string;
	itin: string;
}

export interface CompanyMemberRelationDraft {
	member_id: string | null;
	percentage: number | null;
	start_date: string;
	is_member: boolean;
	is_manager: boolean;
}

const emptyMemberDraft: MemberDraft = {
	person_type: 'individual',
	first_name: '',
	last_name: '',
	name: '',
	birth_date: '',
	incorporation_date: '',
	identification_type: 'passport',
	identification_number: '',
	country_nationality_id: null,
	country_residence_id: null,
	marital_status: '',
	ssn: '',
	itin: '',
};

const emptyRelationDraft: CompanyMemberRelationDraft = {
	member_id: null,
	percentage: null,
	start_date: '',
	is_member: true,
	is_manager: false,
};

const memberToDraft = (member: MemberItem | null): MemberDraft => ({
	person_type: member?.person_type ?? 'individual',
	first_name: member?.first_name ?? '',
	last_name: member?.last_name ?? '',
	name: member?.name ?? '',
	birth_date: member?.birth_date ?? '',
	incorporation_date: member?.incorporation_date ?? '',
	identification_type: member?.identification_type ?? 'passport',
	identification_number: member?.identification_number ?? '',
	country_nationality_id: member?.country_nationality_id ?? null,
	country_residence_id: member?.country_residence_id ?? null,
	marital_status: (member?.marital_status as MemberMaritalStatus) ?? '',
	ssn: member?.ssn ?? '',
	itin: member?.itin ?? '',
});

const relationToDraft = (
	row: CompanyMemberItem,
): CompanyMemberRelationDraft => ({
	member_id: row.member_id,
	percentage: row.percentage,
	start_date: row.start_date ?? '',
	is_member: row.is_member,
	is_manager: row.is_manager,
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
		throw new Error(payload?.error ?? 'No se pudo completar la operación');
	}
	return payload.data as T;
};

export type MembersCrudScope =
	{ kind: 'incorporation'; id: string } | { kind: 'company'; id: string };

interface UseCompanyMembersCrudParams {
	initialRows: CompanyMemberItem[];
	scope: MembersCrudScope;
}

const buildMembersBasePath = (scope: MembersCrudScope) =>
	scope.kind === 'incorporation'
		? `/api/incorporations/${scope.id}/members`
		: `/api/companies/${scope.id}/members`;

export function useCompanyMembersCrud({
	initialRows,
	scope,
}: UseCompanyMembersCrudParams) {
	const basePath = buildMembersBasePath(scope);
	const [rows, setRows] = React.useState<CompanyMemberItem[]>(initialRows);
	const [activeRow, setActiveRow] = React.useState<CompanyMemberItem | null>(
		null,
	);

	const [memberDraft, setMemberDraft] =
		React.useState<MemberDraft>(emptyMemberDraft);
	const [relationDraft, setRelationDraft] =
		React.useState<CompanyMemberRelationDraft>(emptyRelationDraft);

	const [selectedMember, setSelectedMember] = React.useState<MemberItem | null>(
		null,
	);
	const [isCreatingNewPerson, setIsCreatingNewPerson] = React.useState(false);

	const [isCreateOpen, setIsCreateOpen] = React.useState(false);
	const [isEditOpen, setIsEditOpen] = React.useState(false);
	const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);
	const [isEditPersonOpen, setIsEditPersonOpen] = React.useState(false);
	const [isSaving, setIsSaving] = React.useState(false);

	React.useEffect(() => {
		setRows(initialRows);
	}, [initialRows]);

	const updateMemberDraft =
		<K extends keyof MemberDraft>(field: K) =>
		(value: MemberDraft[K]) => {
			setMemberDraft((prev) => ({ ...prev, [field]: value }));
		};

	const hasMemberName =
		memberDraft.person_type === 'entity'
			? memberDraft.name.trim().length > 0
			: memberDraft.first_name.trim().length > 0 ||
				memberDraft.last_name.trim().length > 0;

	const updateRelationDraft =
		<K extends keyof CompanyMemberRelationDraft>(field: K) =>
		(value: CompanyMemberRelationDraft[K]) => {
			setRelationDraft((prev) => ({ ...prev, [field]: value }));
		};

	const resetDrafts = () => {
		setMemberDraft(emptyMemberDraft);
		setRelationDraft(emptyRelationDraft);
		setSelectedMember(null);
		setIsCreatingNewPerson(false);
	};

	const openCreate = () => {
		resetDrafts();
		setActiveRow(null);
		setIsCreateOpen(true);
	};

	const openEdit = (row: CompanyMemberItem) => {
		setActiveRow(row);
		setSelectedMember(row.member);
		setMemberDraft(memberToDraft(row.member));
		setRelationDraft(relationToDraft(row));
		setIsCreatingNewPerson(false);
		setIsEditOpen(true);
	};

	const openDelete = (row: CompanyMemberItem) => {
		setActiveRow(row);
		setIsDeleteOpen(true);
	};

	const openEditPerson = () => {
		if (!selectedMember) return;
		setMemberDraft(memberToDraft(selectedMember));
		setIsEditPersonOpen(true);
	};

	const pickExistingMember = (member: MemberItem) => {
		setSelectedMember(member);
		setMemberDraft(memberToDraft(member));
		setRelationDraft((prev) => ({ ...prev, member_id: member.id }));
		setIsCreatingNewPerson(false);
	};

	const switchToNewPerson = (initialName?: string) => {
		setSelectedMember(null);
		setMemberDraft({ ...emptyMemberDraft, first_name: initialName ?? '' });
		setRelationDraft((prev) => ({ ...prev, member_id: null }));
		setIsCreatingNewPerson(true);
	};

	const updateMemberRecord = async (memberId: string): Promise<MemberItem> => {
		return requestJson<MemberItem>(`/api/members/${memberId}`, {
			method: 'PATCH',
			body: JSON.stringify(memberDraft),
		});
	};

	const updateRelation = async (companyMemberId: number) => {
		const body = {
			member_id: relationDraft.member_id,
			percentage: relationDraft.percentage,
			start_date: relationDraft.start_date || null,
			is_member: relationDraft.is_member,
			is_manager: relationDraft.is_manager,
		};
		return requestJson<CompanyMemberItem>(`${basePath}/${companyMemberId}`, {
			method: 'PATCH',
			body: JSON.stringify(body),
		});
	};

	const createMember = async () => {
		setIsSaving(true);
		const toastId = toast.loading('Guardando miembro...');
		try {
			// Una sola llamada atómica: o vinculamos persona existente, o creamos
			// persona + relación en el backend (con rollback si la relación falla).
			const baseBody = {
				percentage: relationDraft.percentage,
				start_date: relationDraft.start_date || null,
				is_member: relationDraft.is_member,
				is_manager: relationDraft.is_manager,
			};

			const body =
				isCreatingNewPerson || !selectedMember?.id
					? { ...baseBody, new_person: memberDraft }
					: { ...baseBody, member_id: selectedMember.id };

			const row = await requestJson<CompanyMemberItem>(basePath, {
				method: 'POST',
				body: JSON.stringify(body),
			});
			setRows((prev) => [row, ...prev]);
			toast.success('Miembro agregado a la empresa', { id: toastId });
			setIsCreateOpen(false);
			resetDrafts();
		} catch (error) {
			const message =
				error instanceof Error ? error.message : 'Error inesperado';
			toast.error(friendlyError(message), { id: toastId });
		} finally {
			setIsSaving(false);
		}
	};

	const saveRelation = async () => {
		if (!activeRow) return;
		setIsSaving(true);
		const toastId = toast.loading('Guardando cambios...');
		try {
			const updated = await updateRelation(activeRow.id);
			setRows((prev) =>
				prev.map((row) => (row.id === updated.id ? updated : row)),
			);
			setActiveRow(updated);
			toast.success('Relación actualizada', { id: toastId });
			setIsEditOpen(false);
		} catch (error) {
			const message =
				error instanceof Error ? error.message : 'Error inesperado';
			toast.error(friendlyError(message), { id: toastId });
		} finally {
			setIsSaving(false);
		}
	};

	const savePerson = async () => {
		if (!selectedMember) return;
		setIsSaving(true);
		const toastId = toast.loading('Actualizando datos de la persona...');
		try {
			const updated = await updateMemberRecord(selectedMember.id);
			setSelectedMember(updated);
			setRows((prev) =>
				prev.map((row) =>
					row.member_id === updated.id ? { ...row, member: updated } : row,
				),
			);
			toast.success('Datos de la persona actualizados', { id: toastId });
			setIsEditPersonOpen(false);
		} catch (error) {
			const message =
				error instanceof Error ? error.message : 'Error inesperado';
			toast.error(friendlyError(message), { id: toastId });
		} finally {
			setIsSaving(false);
		}
	};

	const removeMember = async (reason: string | null) => {
		if (!activeRow) return;
		setIsSaving(true);
		const toastId = toast.loading('Eliminando miembro...');
		try {
			await requestJson(`${basePath}/${activeRow.id}`, {
				method: 'DELETE',
				body: JSON.stringify({ reason }),
			});
			setRows((prev) => prev.filter((row) => row.id !== activeRow.id));
			toast.success('Miembro eliminado de la empresa', { id: toastId });
			setIsDeleteOpen(false);
		} catch (error) {
			const message =
				error instanceof Error ? error.message : 'Error inesperado';
			toast.error(friendlyError(message), { id: toastId });
		} finally {
			setIsSaving(false);
		}
	};

	return {
		// state
		rows,
		activeRow,
		selectedMember,
		isCreatingNewPerson,
		memberDraft,
		relationDraft,
		hasMemberName,
		isSaving,

		// dialogs
		isCreateOpen,
		setIsCreateOpen,
		isEditOpen,
		setIsEditOpen,
		isDeleteOpen,
		setIsDeleteOpen,
		isEditPersonOpen,
		setIsEditPersonOpen,

		// actions
		openCreate,
		openEdit,
		openDelete,
		openEditPerson,
		pickExistingMember,
		switchToNewPerson,
		updateMemberDraft,
		updateRelationDraft,
		createMember,
		saveRelation,
		savePerson,
		removeMember,
	};
}

function friendlyError(message: string) {
	switch (message) {
		case 'COMPANY_MEMBER_DUPLICATE':
			return 'Esta persona ya es miembro activo de la empresa';
		case 'ROLE_REQUIRED':
			return 'Debe ser socio, manager o ambos';
		case 'PERCENTAGE_OUT_OF_RANGE':
			return 'El porcentaje debe estar entre 0 y 100';
		case 'MEMBER_FULL_NAME_REQUIRED':
			return 'El nombre del miembro es obligatorio';
		case 'MEMBER_ID_REQUIRED':
			return 'Selecciona un miembro existente o completa los datos para crear uno nuevo';
		case 'MEMBER_OR_NEW_PERSON_REQUIRED':
			return 'Selecciona un miembro existente o completa los datos para crear uno nuevo';
		case 'MEMBER_AND_NEW_PERSON_BOTH_PROVIDED':
			return 'Elige un miembro existente o crea uno nuevo, no ambos';
		case 'COMPANY_MEMBER_NOT_FOUND':
			return 'No se encontró el miembro de la empresa';
		case 'MEMBER_NOT_FOUND':
			return 'No se encontró el miembro';
		case 'COMPANY_NOT_CREATED':
			return 'Primero crea la empresa para poder agregar miembros';
		case 'FORBIDDEN':
			return 'No tienes permisos para esta acción';
		default:
			return message;
	}
}
