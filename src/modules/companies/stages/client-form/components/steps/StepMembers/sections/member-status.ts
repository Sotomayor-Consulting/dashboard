import type { Member } from '../../../../types';
import { countAddressCompleted } from './MemberAddressSection';
import { countDocumentsCompleted } from './MemberDocumentsSection';
import { countIdentityCompleted } from './MemberIdentitySection';
import { countParticipationCompleted } from './MemberParticipationSection';

import type { SocioStatus } from '../SocioPill';

/**
 * Suma de campos completados en las 4 sub-secciones del socio.
 * Total fijo de 5 + 2 + 3 + 3 = 13.
 */
export function getMemberCompletion(member: Member | undefined): {
	completed: number;
	total: number;
	status: SocioStatus;
} {
	// Totales por sub-sección: A=5 · B=2 · C=3 · D=6 (dirección US-style).
	const total = 5 + 2 + 3 + 6;
	const completed =
		countIdentityCompleted(member) +
		countParticipationCompleted(member) +
		countDocumentsCompleted(member) +
		countAddressCompleted(member);
	let status: SocioStatus;
	if (completed === 0) status = 'empty';
	else if (completed >= total) status = 'complete';
	else status = 'inProgress';
	return { completed, total, status };
}

/** Clave de las 4 sub-secciones, alineada con los kickers A/B/C/D. */
export type MemberSectionKey = 'A' | 'B' | 'C' | 'D';

export interface MissingSection {
	section: MemberSectionKey;
	/** Título legible de la sub-sección. */
	sectionLabel: string;
	/** Etiquetas de los campos que aún faltan en esa sub-sección. */
	fields: string[];
}

/**
 * Devuelve, agrupados por sub-sección, los campos que aún faltan para
 * completar un socio. La lógica espeja exactamente a las funciones
 * `countXxxCompleted`, por lo que el total de campos faltantes siempre
 * coincide con `total - completed` (el "N pendientes" del pill).
 *
 * Las etiquetas se adaptan al tipo de socio (persona / empresa) y a la
 * residencia fiscal, igual que los labels reales del formulario.
 */
export function getMemberMissingFields(
	member: Member | undefined,
): MissingSection[] {
	const isCompany = member?.tipoSocio === 'empresa';
	const isResident = !isCompany && member?.residenteFiscalEEUU === true;

	// A · Identidad
	const identity: string[] = [];
	if (!member?.tipoSocio) identity.push('Tipo de socio');
	if (!member?.nombreCompleto?.trim())
		identity.push(isCompany ? 'Nombre de la empresa' : 'Nombres y apellidos');
	if (!member?.correo?.trim()) identity.push('Correo electrónico');
	if (!isCompany && !member?.estadoCivil) identity.push('Estado civil');
	if (!member?.nacionalidad?.trim())
		identity.push(isCompany ? 'País de constitución' : 'País de nacionalidad');

	// B · Participación
	const participation: string[] = [];
	if (!((member?.porcentaje ?? 0) > 0))
		participation.push('Porcentaje de participación');
	if (!isCompany && member?.residenteFiscalEEUU == null)
		participation.push('Residencia fiscal en EE. UU.');

	// C · Identificación y documentos
	const documents: string[] = [];
	if (isCompany) {
		if (!member?.tipoIdentificacionFiscal)
			documents.push('Tipo de identificación');
		if (!member?.numeroPasaporte?.trim())
			documents.push('Número de identificación');
	} else if (isResident) {
		if (!member?.ssn?.trim()) documents.push('Número de SSN');
	} else if (!member?.numeroPasaporte?.trim()) {
		documents.push('Número de pasaporte');
	}
	if (!member?.pasaporte && !member?.pasaportePath)
		documents.push(
			isCompany ? 'Certificado de existencia' : 'Pasaporte (escaneo)',
		);

	// D · Dirección (shape unificado US-style — línea 2 y condado opcionales)
	const address: string[] = [];
	if (!member?.paisFactura?.trim()) address.push('País');
	if (!member?.direccion?.trim()) address.push('Línea 1 (dirección)');
	if (!member?.ciudad?.trim()) address.push('Ciudad');
	if (!member?.estado?.trim()) address.push('Estado / Provincia');
	if (!member?.codigoPostal?.trim()) address.push('Código postal');
	if (!member?.facturaServicio && !member?.facturaServicioPath)
		address.push('Planilla de servicio básico');

	const sections: MissingSection[] = [
		{ section: 'A', sectionLabel: 'Identidad', fields: identity },
		{ section: 'B', sectionLabel: 'Participación', fields: participation },
		{
			section: 'C',
			sectionLabel: 'Identificación y documentos',
			fields: documents,
		},
		{ section: 'D', sectionLabel: 'Dirección', fields: address },
	];

	return sections.filter((s) => s.fields.length > 0);
}
