import * as React from 'react';
import type { CompanyMemberItem, ManagerItem } from '../types';

type SourceType = 'member' | 'external';

interface ManagerDraft {
	member_id: string;
	source_type: SourceType;
	Nombres_manager: string;
	Correo_electronico_manager: string;
	Pais_de_nacionalidad_manager: string;
	residente_fiscal_en_EE_UU_manager: boolean;
	manager_misma_direccion_empresa: boolean;
	Numero_de_pasaporte_manager: string;
	Numero_de_seguro_social_manager: string;
	Numero_de_ITIN_manager: string;
	Direccion_de_planilla_manager: string;
}

const emptyDraft: ManagerDraft = {
	member_id: '',
	source_type: 'member',
	Nombres_manager: '',
	Correo_electronico_manager: '',
	Pais_de_nacionalidad_manager: '',
	residente_fiscal_en_EE_UU_manager: false,
	manager_misma_direccion_empresa: false,
	Numero_de_pasaporte_manager: '',
	Numero_de_seguro_social_manager: '',
	Numero_de_ITIN_manager: '',
	Direccion_de_planilla_manager: '',
};

export function useCompanyManagersCrud(
	initialManagers: ManagerItem[],
	members: CompanyMemberItem[],
	companyId: string,
) {
	const [managers, setManagers] = React.useState<ManagerItem[]>(initialManagers);
	const [isCreateOpen, setIsCreateOpen] = React.useState(false);
	const [isEditOpen, setIsEditOpen] = React.useState(false);
	const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);
	const [activeManager, setActiveManager] = React.useState<ManagerItem | null>(null);
	const [draft, setDraft] = React.useState<ManagerDraft>(emptyDraft);

	const updateDraft =
		<K extends keyof ManagerDraft>(field: K) =>
		(value: ManagerDraft[K]) => {
			setDraft((prev) => ({ ...prev, [field]: value }));
		};

	const hydrateFromMember = (memberId: string) => {
		const member = members.find((item) => String(item.id) === memberId);
		if (!member) return;
		setDraft((prev) => ({
			...prev,
			member_id: memberId,
			source_type: 'member',
			Nombres_manager: member.full_name ?? prev.Nombres_manager,
			Correo_electronico_manager: member.email ?? prev.Correo_electronico_manager,
			residente_fiscal_en_EE_UU_manager: Boolean(member.is_us_tax_resident),
		}));
	};

	const openCreate = () => {
		setDraft(emptyDraft);
		setIsCreateOpen(true);
	};

	const openEdit = (manager: ManagerItem) => {
		setActiveManager(manager);
		setDraft({
			member_id: '',
			source_type: 'external',
			Nombres_manager: manager.Nombres_manager ?? '',
			Correo_electronico_manager: manager.Correo_electronico_manager ?? '',
			Pais_de_nacionalidad_manager: manager.Pais_de_nacionalidad_manager ?? '',
			residente_fiscal_en_EE_UU_manager:
				manager.residente_fiscal_en_EE_UU_manager ?? false,
			manager_misma_direccion_empresa:
				manager.manager_misma_direccion_empresa ?? false,
			Numero_de_pasaporte_manager: manager.Numero_de_pasaporte_manager ?? '',
			Numero_de_seguro_social_manager:
				manager.Numero_de_seguro_social_manager ?? '',
			Numero_de_ITIN_manager: manager.Numero_de_ITIN_manager ?? '',
			Direccion_de_planilla_manager: manager.Direccion_de_planilla_manager ?? '',
		});
		setIsEditOpen(true);
	};

	const openDelete = (manager: ManagerItem) => {
		setActiveManager(manager);
		setIsDeleteOpen(true);
	};

	const createManager = () => {
		const newManager: ManagerItem = {
			id: `tmp-manager-${Date.now()}`,
			empresa_incorporacion_id: companyId,
			Nombres_manager: draft.Nombres_manager,
			Correo_electronico_manager: draft.Correo_electronico_manager,
			Pais_de_nacionalidad_manager: draft.Pais_de_nacionalidad_manager,
			residente_fiscal_en_EE_UU_manager: draft.residente_fiscal_en_EE_UU_manager,
			manager_misma_direccion_empresa: draft.manager_misma_direccion_empresa,
			Numero_de_pasaporte_manager: draft.Numero_de_pasaporte_manager,
			Numero_de_seguro_social_manager: draft.Numero_de_seguro_social_manager,
			Numero_de_ITIN_manager: draft.Numero_de_ITIN_manager,
			Direccion_de_planilla_manager: draft.Direccion_de_planilla_manager,
		};

		setManagers((prev) => [newManager, ...prev]);
		setIsCreateOpen(false);
	};

	const saveManager = () => {
		if (!activeManager) return;
		setManagers((prev) =>
			prev.map((item) =>
				item.id === activeManager.id
					? {
							...item,
							Nombres_manager: draft.Nombres_manager,
							Correo_electronico_manager: draft.Correo_electronico_manager,
							Pais_de_nacionalidad_manager: draft.Pais_de_nacionalidad_manager,
							residente_fiscal_en_EE_UU_manager:
								draft.residente_fiscal_en_EE_UU_manager,
							manager_misma_direccion_empresa:
								draft.manager_misma_direccion_empresa,
							Numero_de_pasaporte_manager: draft.Numero_de_pasaporte_manager,
							Numero_de_seguro_social_manager:
								draft.Numero_de_seguro_social_manager,
							Numero_de_ITIN_manager: draft.Numero_de_ITIN_manager,
							Direccion_de_planilla_manager: draft.Direccion_de_planilla_manager,
					  }
					: item,
			),
		);
		setIsEditOpen(false);
	};

	const removeManager = () => {
		if (!activeManager) return;
		setManagers((prev) => prev.filter((item) => item.id !== activeManager.id));
		setIsDeleteOpen(false);
	};

	return {
		managers,
		activeManager,
		draft,
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
		hydrateFromMember,
		createManager,
		saveManager,
		removeManager,
	};
}
