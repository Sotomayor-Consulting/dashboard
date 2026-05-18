import * as React from 'react';
import type { SocioItem } from '../types';

type MemberDraft = Omit<SocioItem, 'id' | 'id_empresa'>;

const emptyDraft: MemberDraft = {
	nombre_de_socio: '',
	correo: '',
	tipo_de_socio: '',
	porcentaje: null,
	pais_de_nacionalidad: '',
	estado_civil: '',
	residente_fiscal: '',
	numero_de_pasaporte: null,
	numero_de_seguro_social: null,
	numero_itin: null,
	direccion_planilla: null,
	roles: null,
};

export function useCompanyMembersCrud(initialMembers: SocioItem[]) {
	const [members, setMembers] = React.useState<SocioItem[]>(initialMembers);
	const [isCreateOpen, setIsCreateOpen] = React.useState(false);
	const [isEditOpen, setIsEditOpen] = React.useState(false);
	const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);
	const [activeMember, setActiveMember] = React.useState<SocioItem | null>(null);
	const [draft, setDraft] = React.useState<MemberDraft>(emptyDraft);

	const updateDraft =
		<K extends keyof MemberDraft>(field: K) =>
		(value: MemberDraft[K]) => {
			setDraft((prev) => ({ ...prev, [field]: value }));
		};

	const openCreate = () => {
		setDraft(emptyDraft);
		setIsCreateOpen(true);
	};

	const openEdit = (member: SocioItem) => {
		setActiveMember(member);
		setDraft({
			nombre_de_socio: member.nombre_de_socio,
			correo: member.correo,
			tipo_de_socio: member.tipo_de_socio,
			porcentaje: member.porcentaje,
			pais_de_nacionalidad: member.pais_de_nacionalidad,
			estado_civil: member.estado_civil,
			residente_fiscal: member.residente_fiscal,
			numero_de_pasaporte: member.numero_de_pasaporte,
			numero_de_seguro_social: member.numero_de_seguro_social,
			numero_itin: member.numero_itin,
			direccion_planilla: member.direccion_planilla,
			roles: member.roles,
		});
		setIsEditOpen(true);
	};

	const openDelete = (member: SocioItem) => {
		setActiveMember(member);
		setIsDeleteOpen(true);
	};

	const createMember = () => {
		const newMember: SocioItem = {
			id: `tmp-${Date.now()}`,
			id_empresa: members[0]?.id_empresa ?? '',
			...draft,
		};
		setMembers((prev) => [newMember, ...prev]);
		setIsCreateOpen(false);
	};

	const saveMember = () => {
		if (!activeMember) return;
		setMembers((prev) =>
			prev.map((member) =>
				member.id === activeMember.id
					? {
							...member,
							...draft,
					  }
					: member,
			),
		);
		setIsEditOpen(false);
	};

	const removeMember = () => {
		if (!activeMember) return;
		setMembers((prev) => prev.filter((member) => member.id !== activeMember.id));
		setIsDeleteOpen(false);
	};

	return {
		members,
		activeMember,
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
		createMember,
		saveMember,
		removeMember,
	};
}
