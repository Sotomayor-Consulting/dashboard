// Contrato de persistencia del formulario de incorporación (staging).
//
// Estructura:
//  - Seccionado por dominio (general / members / managers / irsResponsible /
//    signature / consent) + `meta` separado del envelope.
//  - Socios como UNIÓN DISCRIMINADA por `type` ('person' | 'company').
//  - Archivos como `FileRef` rico ({ path, name, mime, size }).
//  - Claves en inglés (convención del codebase para estructura nueva).

import type {
	ClientFormData,
	FileRef,
	FiscalIdType,
	ManagementType,
	Manager,
	MaritalStatus,
	Member,
	TaxClassification,
} from '../types';

/** Versión del contrato. Viaja en `payload.version`. */
export const INCORPORATION_FORM_VERSION = 'v2' as const;

type FileRefJson = FileRef | null;

export interface OperatingAddressV2 extends AddressV2 {
	utilityBill: FileRefJson;
}

export interface GeneralSectionV2 {
	usSourceIncome: boolean | null;
	activity: {
		id: string;
		notListed: boolean;
		description: string;
		irsCode: string;
		irsActivityDescription: string;
	};
	management: ManagementType;
	taxation: TaxClassification;
	operatingAddress: OperatingAddressV2;
}

/**
 * Dirección unificada (US-style) compartida por la dirección operativa de la
 * LLC, la dirección del socio y la del manager. País/línea 1/ciudad/estado/
 * código postal son obligatorios; línea 2 y condado son opcionales.
 */
export interface CountryRefV2 {
	iso: string;
	name: string;
	phoneCode: string;
}

export interface AddressV2 {
	country: CountryRefV2 | string;
	line1: string;
	line2: string;
	city: string;
	state: string;
	county: string;
	postalCode: string;
}

interface MemberCommonV2 {
	id: string;
	email: string;
	ownershipPercent: number;
	address: AddressV2;
}

export interface PersonMemberV2 extends MemberCommonV2 {
	type: 'person';
	fullName: string;
	maritalStatus: MaritalStatus;
	usTaxResident: boolean;
	nationality: CountryRefV2 | string;
	ssn: string;
	itin: string;
	passportNumber: string;
	documents: { passport: FileRefJson; utilityBill: FileRefJson };
}

export interface CompanyMemberV2 extends MemberCommonV2 {
	type: 'company';
	legalName: string;
	incorporationCountry: CountryRefV2 | string;
	website: string;
	fiscalIdType: FiscalIdType;
	fiscalIdNumber: string;
	documents: { existenceCertificate: FileRefJson; utilityBill: FileRefJson };
}

export type MemberV2 = PersonMemberV2 | CompanyMemberV2;

export interface ManagerV2 {
	id: string;
	name: string;
	email: string;
	usTaxResident: boolean;
	ssn: string;
	itin: string;
	passportNumber: string;
	nationality: CountryRefV2 | string;
	sameAddressAsCompany: boolean;
	/** Dirección unificada US-style. Aplica cuando `sameAddressAsCompany === false`. */
	address: AddressV2;
	documents: { passport: FileRefJson; utilityBill: FileRefJson };
}

export interface IncorporationFormPayloadV2 {
	version: typeof INCORPORATION_FORM_VERSION;
	meta: { form: 'incorporation-llc' };
	general: GeneralSectionV2;
	members: { publicInfo: boolean; list: MemberV2[] };
	managers: {
		sciAssigns: boolean | null;
		isMember: boolean | null;
		addOthers: boolean;
		selectedMemberIds: string[];
		publicInfo: boolean;
		list: ManagerV2[];
	};
	irsResponsible: { memberId: string };
	signature: { dataUrl: string | null; file: FileRefJson };
	consent: { acceptedTerms: boolean };
}

const ref = (r: FileRef | null | undefined): FileRefJson => r ?? null;

type CountryList = ReadonlyArray<CountryRefV2>;

/**
 * Resuelve un nombre de país (como se guarda en el form state) al snapshot
 * `CountryRefV2`. Si no hay match, devuelve el string tal cual (backward-compat).
 */
function resolveCountry(
	name: string,
	countries: CountryList,
): CountryRefV2 | string {
	if (!name) return name;
	const match = countries.find(
		(c) => c.name === name || c.iso === name,
	);
	return match ?? name;
}

/** Helper para construir la dirección unificada desde state campo-a-campo. */
function addressFromMember(m: Member, countries: CountryList): AddressV2 {
	return {
		country: resolveCountry(m.paisFactura, countries),
		line1: m.direccion,
		line2: m.linea2,
		city: m.ciudad,
		state: m.estado,
		county: m.condado,
		postalCode: m.codigoPostal,
	};
}

function addressFromManager(m: Manager, countries: CountryList): AddressV2 {
	return {
		country: resolveCountry(m.paisResidencia, countries),
		line1: m.direccion,
		line2: m.linea2,
		city: m.ciudad,
		state: m.estado,
		county: m.condado,
		postalCode: m.codigoPostal,
	};
}

// ─────────────────────────── State → Payload ───────────────────────────
function memberToV2(m: Member, countries: CountryList): MemberV2 {
	const common: MemberCommonV2 = {
		id: m.id,
		email: m.correo,
		ownershipPercent: m.porcentaje,
		address: addressFromMember(m, countries),
	};
	if (m.tipoSocio === 'empresa') {
		return {
			...common,
			type: 'company',
			legalName: m.nombreCompleto,
			incorporationCountry: resolveCountry(m.nacionalidad, countries),
			website: m.sitioWeb,
			fiscalIdType: m.tipoIdentificacionFiscal,
			fiscalIdNumber: m.numeroPasaporte,
			documents: {
				existenceCertificate: ref(m.pasaporteRef),
				utilityBill: ref(m.facturaServicioRef),
			},
		};
	}
	return {
		...common,
		type: 'person',
		fullName: m.nombreCompleto,
		maritalStatus: m.estadoCivil,
		usTaxResident: m.residenteFiscalEEUU,
		nationality: resolveCountry(m.nacionalidad, countries),
		ssn: m.ssn,
		itin: m.itin,
		passportNumber: m.numeroPasaporte,
		documents: {
			passport: ref(m.pasaporteRef),
			utilityBill: ref(m.facturaServicioRef),
		},
	};
}

function managerToV2(
	m: Manager,
	operatingAddress: AddressV2,
	countries: CountryList,
): ManagerV2 {
	return {
		id: m.id,
		name: m.nombre,
		email: m.correo,
		usTaxResident: m.residenteFiscal,
		ssn: m.ssn,
		itin: m.itin,
		passportNumber: m.numeroPasaporte,
		nationality: resolveCountry(m.nacionalidad, countries),
		sameAddressAsCompany: m.mismaDireccionEmpresa,
		address: m.mismaDireccionEmpresa
			? operatingAddress
			: addressFromManager(m, countries),
		documents: {
			passport: ref(m.pasaporteRef),
			utilityBill: m.mismaDireccionEmpresa ? null : ref(m.facturaServicioRef),
		},
	};
}

/**
 * Proyecta el state del wizard al contrato v2 (sin `File`).
 * `countries` enriquece los campos de país con `CountryRefV2`.
 * Si no se pasa, los países se guardan como string (backward-compat).
 */
export function toIncorporationFormPayloadV2(
	data: ClientFormData,
	countries: CountryList = [],
): IncorporationFormPayloadV2 {
	const opAddr: AddressV2 = {
		country: resolveCountry(data.pais, countries),
		line1: data.direccion,
		line2: data.linea2,
		city: data.ciudad,
		county: data.condado,
		state: data.estado,
		postalCode: data.codigoPostal,
	};

	return {
		version: INCORPORATION_FORM_VERSION,
		meta: { form: 'incorporation-llc' },
		general: {
			usSourceIncome: data.ingresosEEUU,
			activity: {
				id: data.actividad,
				notListed: data.actividadNoEnLista,
				description: data.descripcionActividad,
				irsCode: data.codigoActividad,
				irsActivityDescription: data.descripcionActividadIRS,
			},
			management: data.formaAdministracion,
			taxation: data.formaTributacion,
			operatingAddress: {
				...opAddr,
				utilityBill: ref(data.facturaServicioBasicoEEUURef),
			},
		},
		members: {
			publicInfo: data.informacionMiembrosPublica,
			list: data.miembros.map((m) => memberToV2(m, countries)),
		},
		managers: {
			sciAssigns: data.managerSCI,
			isMember: data.managerEsMiembro,
			addOthers: data.agregarOtrosSocios,
			selectedMemberIds: data.seleccionManagers,
			publicInfo: data.informacionManagersPublica,
			list: data.managers.map((m) => managerToV2(m, opAddr, countries)),
		},
		irsResponsible: { memberId: data.responsableIRS },
		signature: { dataUrl: data.firma, file: ref(data.firmaRef) },
		consent: { acceptedTerms: data.aceptaTerminos },
	};
}

// ─────────────────────────── Payload → State ───────────────────────────

/** Extrae el nombre del país desde un `CountryRefV2 | string` del payload. */
function countryName(c: CountryRefV2 | string | undefined | null): string {
	if (!c) return '';
	if (typeof c === 'string') return c;
	return c.name ?? '';
}

function emptyMember(id: string): Member {
	return {
		id,
		tipoSocio: 'persona',
		nombreCompleto: '',
		correo: '',
		estadoCivil: '',
		porcentaje: 0,
		residenteFiscalEEUU: false,
		pasaporte: null,
		numeroPasaporte: '',
		nacionalidad: '',
		ssn: '',
		itin: '',
		facturaServicio: null,
		paisFactura: '',
		direccion: '',
		linea2: '',
		ciudad: '',
		estado: '',
		condado: '',
		codigoPostal: '',
		tipoIdentificacionFiscal: '',
		sitioWeb: '',
	};
}

function memberFromV2(mv: MemberV2): Member {
	const m = emptyMember(mv.id);
	m.correo = mv.email;
	m.porcentaje = mv.ownershipPercent;
	// Dirección unificada (los campos opcionales caen a '' si vienen ausentes).
	m.paisFactura = countryName(mv.address?.country);
	m.direccion = mv.address?.line1 ?? '';
	m.linea2 = mv.address?.line2 ?? '';
	m.ciudad = mv.address?.city ?? '';
	m.estado = mv.address?.state ?? '';
	m.condado = mv.address?.county ?? '';
	m.codigoPostal = mv.address?.postalCode ?? '';

	if (mv.type === 'company') {
		m.tipoSocio = 'empresa';
		m.nombreCompleto = mv.legalName;
		m.nacionalidad = countryName(mv.incorporationCountry);
		m.sitioWeb = mv.website;
		m.tipoIdentificacionFiscal = mv.fiscalIdType;
		m.numeroPasaporte = mv.fiscalIdNumber;
		m.pasaporteRef = mv.documents?.existenceCertificate ?? null;
		m.facturaServicioRef = mv.documents?.utilityBill ?? null;
	} else {
		m.tipoSocio = 'persona';
		m.nombreCompleto = mv.fullName;
		m.estadoCivil = mv.maritalStatus;
		m.residenteFiscalEEUU = mv.usTaxResident;
		m.nacionalidad = countryName(mv.nationality);
		m.ssn = mv.ssn;
		m.itin = mv.itin;
		m.numeroPasaporte = mv.passportNumber;
		m.pasaporteRef = mv.documents?.passport ?? null;
		m.facturaServicioRef = mv.documents?.utilityBill ?? null;
	}
	// Rehidratar `*Path` desde el FileRef para la lógica de UI existente.
	m.pasaportePath = m.pasaporteRef?.path ?? null;
	m.facturaServicioPath = m.facturaServicioRef?.path ?? null;
	return m;
}

function managerFromV2(mv: ManagerV2): Manager {
	return {
		id: mv.id,
		nombre: mv.name,
		correo: mv.email,
		residenteFiscal: mv.usTaxResident,
		itin: mv.itin,
		ssn: mv.ssn,
		pasaporte: null,
		numeroPasaporte: mv.passportNumber,
		nacionalidad: countryName(mv.nationality),
		mismaDireccionEmpresa: mv.sameAddressAsCompany,
		// Dirección unificada del manager.
		paisResidencia: countryName(mv.address?.country),
		direccion: mv.address?.line1 ?? '',
		linea2: mv.address?.line2 ?? '',
		ciudad: mv.address?.city ?? '',
		estado: mv.address?.state ?? '',
		condado: mv.address?.county ?? '',
		codigoPostal: mv.address?.postalCode ?? '',
		facturaServicio: null,
		pasaportePath: mv.documents?.passport?.path ?? null,
		facturaServicioPath: mv.documents?.utilityBill?.path ?? null,
		pasaporteRef: mv.documents?.passport ?? null,
		facturaServicioRef: mv.documents?.utilityBill ?? null,
	};
}

/** Rehidrata el state del wizard desde un payload v2 guardado. */
export function fromIncorporationFormPayloadV2(
	payload: IncorporationFormPayloadV2,
): ClientFormData {
	const g = payload.general;
	const addr = g?.operatingAddress;
	return {
		ingresosEEUU: g?.usSourceIncome ?? null,
		actividad: g?.activity?.id ?? '',
		actividadNoEnLista: g?.activity?.notListed ?? false,
		descripcionActividad: g?.activity?.description ?? '',
		codigoActividad: g?.activity?.irsCode ?? '',
		descripcionActividadIRS: g?.activity?.irsActivityDescription ?? '',
		formaAdministracion: g?.management ?? '',
		formaTributacion: g?.taxation ?? '',
		direccionOperativaEEUU: 'si',
		direccion: addr?.line1 ?? '',
		linea2: addr?.line2 ?? '',
		condado: addr?.county ?? '',
		ciudad: addr?.city ?? '',
		estado: addr?.state ?? '',
		codigoPostal: addr?.postalCode ?? '',
		facturaServicioBasicoEEUU: null,
		facturaServicioBasicoEEUUPath: addr?.utilityBill?.path ?? null,
		facturaServicioBasicoEEUURef: addr?.utilityBill ?? null,
		pais: countryName(addr?.country),
		direccionEmpresa: '',
		facturaServicioBasico: null,
		miembros: (payload.members?.list ?? []).map(memberFromV2),
		informacionMiembrosPublica: payload.members?.publicInfo ?? true,
		managerSCI: payload.managers?.sciAssigns ?? null,
		managerEsMiembro: payload.managers?.isMember ?? null,
		seleccionManagers: payload.managers?.selectedMemberIds ?? [],
		agregarOtrosSocios: payload.managers?.addOthers ?? false,
		managers: (payload.managers?.list ?? []).map(managerFromV2),
		informacionManagersPublica: payload.managers?.publicInfo ?? true,
		responsableIRS: payload.irsResponsible?.memberId ?? '',
		firma: payload.signature?.dataUrl ?? null,
		firmaPath: payload.signature?.file?.path ?? null,
		firmaRef: payload.signature?.file ?? null,
		aceptaTerminos: payload.consent?.acceptedTerms ?? false,
	};
}

/**
 * Rehidrata un payload persistido al state del wizard.
 */
export function parseIncorporationFormPayload(raw: unknown): ClientFormData {
	return fromIncorporationFormPayloadV2(raw as IncorporationFormPayloadV2);
}

// ─────────────────────────── Validación (servidor) ───────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Resuelve las direcciones de managers con `sameAddressAsCompany`: copia la
 * dirección operativa de la LLC para que el payload almacenado esté completo.
 * Muta el payload in-place y lo devuelve.
 */
export function resolveManagerAddresses(
	payload: IncorporationFormPayloadV2,
): IncorporationFormPayloadV2 {
	const opAddr = payload.general?.operatingAddress;
	if (!opAddr) return payload;

	const resolved: AddressV2 = {
		country: opAddr.country,
		line1: opAddr.line1,
		line2: opAddr.line2,
		city: opAddr.city,
		state: opAddr.state,
		county: opAddr.county,
		postalCode: opAddr.postalCode,
	};

	for (const mg of payload.managers?.list ?? []) {
		if (mg.sameAddressAsCompany) {
			mg.address = resolved;
		}
	}

	return payload;
}

/**
 * Validación de integridad del payload v2 en el servidor (defensa en
 * profundidad, fuente de verdad equivalente a los refinements de Zod del
 * cliente). Cubre los 4 pasos —incluida la actividad/dirección del paso 2 y la
 * PRESENCIA de los documentos requeridos— que el validador v1 dejaba sin
 * chequear. Devuelve mensajes legibles; vacío = válido.
 */
/** Valida que un campo country tenga valor (acepta string o CountryRefV2). */
function hasCountry(c: CountryRefV2 | string | undefined | null): boolean {
	if (!c) return false;
	if (typeof c === 'string') return c.trim().length > 0;
	return (c.name ?? '').trim().length > 0;
}

export function validateIncorporationFormPayload(
	payload: IncorporationFormPayloadV2,
): string[] {
	const errors: string[] = [];
	const g = payload.general;

	// Paso 2 — actividad + administración + tributación + dirección operativa.
	if (g?.usSourceIncome == null)
		errors.push('Indica si la LLC tendrá ingresos de EE. UU.');
	const act = g?.activity;
	if (!act?.notListed && !act?.id?.trim())
		errors.push('Selecciona la actividad económica.');
	if (act?.notListed && !act?.description?.trim())
		errors.push('Describe la actividad económica.');
	if (!g?.management) errors.push('Selecciona la forma de administración.');
	if (!g?.taxation) errors.push('Selecciona la forma de tributar.');

	// Dirección operativa unificada (US-style sin importar el país):
	// país + línea 1 + ciudad + estado + código postal son obligatorios;
	// línea 2 y condado son opcionales.
	const addr = g?.operatingAddress;
	if (!hasCountry(addr?.country))
		errors.push('Indica el país de la dirección operativa.');
	if (!addr?.line1?.trim())
		errors.push('Indica la línea 1 de la dirección operativa.');
	if (!addr?.city?.trim())
		errors.push('Indica la ciudad (dirección operativa).');
	if (!addr?.state?.trim())
		errors.push('Indica el estado / provincia (dirección operativa).');
	if (!addr?.postalCode?.trim())
		errors.push('Indica el código postal (dirección operativa).');
	if (!addr?.utilityBill?.path)
		errors.push(
			'Sube la planilla de servicio básico de la dirección operativa.',
		);

	// Paso 3 — socios.
	const members = payload.members?.list ?? [];
	if (members.length === 0) errors.push('Agrega al menos un socio.');

	members.forEach((m, i) => {
		const tag = `Socio ${String(i + 1).padStart(2, '0')}`;
		if (!m.email?.trim() || !EMAIL_RE.test(m.email))
			errors.push(`${tag}: correo inválido.`);
		if (!(m.ownershipPercent >= 1 && m.ownershipPercent <= 100))
			errors.push(`${tag}: porcentaje fuera de rango (1-100).`);
		// Dirección unificada del socio — mismos requeridos que la operativa.
		if (!hasCountry(m.address?.country))
			errors.push(`${tag}: falta el país de la dirección.`);
		if (!m.address?.line1?.trim())
			errors.push(`${tag}: falta la línea 1 de la dirección.`);
		if (!m.address?.city?.trim()) errors.push(`${tag}: falta la ciudad.`);
		if (!m.address?.state?.trim())
			errors.push(`${tag}: falta el estado / provincia.`);
		if (!m.address?.postalCode?.trim())
			errors.push(`${tag}: falta el código postal.`);
		if (!m.documents?.utilityBill?.path)
			errors.push(`${tag}: falta la planilla de servicio básico.`);

		if (m.type === 'company') {
			if (!m.legalName?.trim())
				errors.push(`${tag}: falta el nombre de la empresa.`);
			if (!hasCountry(m.incorporationCountry))
				errors.push(`${tag}: falta el país de constitución.`);
			if (!m.fiscalIdType)
				errors.push(`${tag}: falta el tipo de identificación.`);
			if (!m.fiscalIdNumber?.trim())
				errors.push(`${tag}: falta el número de identificación.`);
			if (!m.documents?.existenceCertificate?.path)
				errors.push(`${tag}: falta el certificado de existencia.`);
		} else {
			if (!m.fullName?.trim()) errors.push(`${tag}: falta el nombre.`);
			if (!hasCountry(m.nationality))
				errors.push(`${tag}: falta el país de nacionalidad.`);
			if (!m.maritalStatus) errors.push(`${tag}: falta el estado civil.`);
			const idNum = m.usTaxResident ? m.ssn : m.passportNumber;
			if (!idNum?.trim())
				errors.push(
					`${tag}: falta el número de identificación (SSN/pasaporte).`,
				);
			if (!m.documents?.passport?.path)
				errors.push(`${tag}: falta el pasaporte (escaneo).`);
		}
	});

	const sum = members.reduce((s, m) => s + (m.ownershipPercent || 0), 0);
	if (members.length > 0 && sum !== 100)
		errors.push(`Los porcentajes deben sumar 100% (actual: ${sum}%).`);

	// Paso 4 — responsable IRS + manager.
	const irsId = payload.irsResponsible?.memberId;
	const irsMember = members.find((m) => m.id === irsId);
	if (!irsId || !irsMember)
		errors.push('El responsable frente al IRS debe ser uno de los socios.');
	else if (irsMember.type === 'company')
		errors.push('El responsable frente al IRS debe ser una persona natural.');

	if (
		g?.management === 'manager-managed' &&
		payload.managers?.sciAssigns === false
	) {
		const hasManager =
			(payload.managers?.selectedMemberIds?.length ?? 0) > 0 ||
			(payload.managers?.list?.length ?? 0) > 0;
		if (!hasManager) errors.push('Define al menos un manager.');
	}

	// Cada manager externo con dirección propia: si no usa la misma de la
	// empresa, exigir el set unificado (país, línea 1, ciudad, estado, ZIP).
	(payload.managers?.list ?? []).forEach((mg, i) => {
		if (mg.sameAddressAsCompany) return;
		const tag = `Manager ${String(i + 1).padStart(2, '0')}`;
		if (!hasCountry(mg.address?.country))
			errors.push(`${tag}: falta el país de residencia.`);
		if (!mg.address?.line1?.trim())
			errors.push(`${tag}: falta la línea 1 de la dirección.`);
		if (!mg.address?.city?.trim()) errors.push(`${tag}: falta la ciudad.`);
		if (!mg.address?.state?.trim())
			errors.push(`${tag}: falta el estado / provincia.`);
		if (!mg.address?.postalCode?.trim())
			errors.push(`${tag}: falta el código postal.`);
	});

	// Paso 5 — firma + términos.
	if (!payload.signature?.file?.path && !payload.signature?.dataUrl)
		errors.push('Falta la firma.');
	if (!payload.consent?.acceptedTerms)
		errors.push('Debes aceptar los términos y condiciones.');

	return errors;
}

/**
 * Validación estructural ligera para el PATCH de draft: verifica que el
 * payload sea un shape reconocible (v2 con las secciones esperadas, o v1
 * plano con `version: 'v1'`), SIN exigir completitud de campos. Un payload
 * que no pase esta guarda probablemente romperá el reload del wizard.
 */
export function isDraftPayloadShape(payload: unknown): {
	ok: boolean;
	reason?: string;
} {
	if (!payload || typeof payload !== 'object')
		return { ok: false, reason: 'PAYLOAD_NOT_OBJECT' };

	const p = payload as Record<string, unknown>;

	if (p.version !== 'v2')
		return { ok: false, reason: `UNKNOWN_VERSION_${String(p.version)}` };

	const requiredSections = [
		'general',
		'members',
		'managers',
		'irsResponsible',
		'signature',
		'consent',
	] as const;
	for (const key of requiredSections) {
		if (typeof p[key] !== 'object' || p[key] === null)
			return { ok: false, reason: `MISSING_SECTION_${key.toUpperCase()}` };
	}
	if (
		!Array.isArray((p.members as Record<string, unknown>)?.list) ||
		!Array.isArray((p.managers as Record<string, unknown>)?.list)
	)
		return { ok: false, reason: 'MEMBERS_OR_MANAGERS_LIST_NOT_ARRAY' };
	return { ok: true };
}

// ─────────────────────────── Helpers de progreso ───────────────────────────

const STEP_LABELS: Record<number, string> = {
	1: 'Identidad de la empresa',
	2: 'Actividad y dirección',
	3: 'Socios',
	4: 'Manager y responsable IRS',
	5: 'Confirmación y firma',
};

export function stepLabel(step: number): string {
	return STEP_LABELS[step] ?? `Paso ${step}`;
}

export function computeFormProgress(data: ClientFormData): number {
	const milestones: boolean[] = [
		data.ingresosEEUU !== null &&
			data.formaAdministracion !== '' &&
			data.formaTributacion !== '' &&
			(data.actividad !== '' || data.actividadNoEnLista),
		data.miembros.length > 0 &&
			data.miembros.reduce((s, m) => s + (m.porcentaje || 0), 0) === 100,
		data.managerEsMiembro !== null || data.managerSCI !== null,
		data.responsableIRS !== '',
		(data.firma !== null || (data.firmaPath ?? null) !== null) &&
			data.aceptaTerminos,
	];
	return Math.round(
		(milestones.filter(Boolean).length / milestones.length) * 100,
	);
}
