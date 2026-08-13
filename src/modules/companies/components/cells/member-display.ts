import type { MemberItem } from '../../types';

const ID_TYPE_LABEL: Record<string, string> = {
	passport: 'Pasaporte',
	id: 'Cédula',
	drivers_license: 'Licencia',
	ein: 'EIN',
};

export function memberDisplayName(member: MemberItem | null) {
	if (!member) return 'Sin nombre';
	if (member.person_type === 'entity') {
		return member.name ?? 'Sin razón social';
	}
	const composed = [member.first_name, member.last_name]
		.filter(Boolean)
		.join(' ')
		.trim();
	return composed || 'Sin nombre';
}

export function memberIdentification(member: MemberItem | null) {
	if (!member?.identification_number) return 'Sin identificación';
	const label = ID_TYPE_LABEL[member.identification_type] ?? 'ID';
	return `${label}: ${member.identification_number}`;
}

/** Etiqueta del tipo de identificación, para su propia columna. */
export function memberIdentificationTypeLabel(member: MemberItem | null) {
	if (!member?.identification_type) return '—';
	return ID_TYPE_LABEL[member.identification_type] ?? 'ID';
}

/** Número de identificación, sin el prefijo del tipo. */
export function memberIdentificationNumber(member: MemberItem | null) {
	return member?.identification_number?.trim() || '—';
}

export function memberShortType(type?: MemberItem['person_type']) {
	if (!type) return '—';
	return type === 'entity' ? 'Jurídica' : 'Natural';
}
