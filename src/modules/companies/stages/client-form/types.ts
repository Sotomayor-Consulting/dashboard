// Types del wizard de incorporación del cliente.
// Estos tipos describen el estado completo del formulario en memoria.
// La validación detallada vive en `schemas/` (Zod).

export type StepId = 1 | 2 | 3 | 4 | 5;

export type MemberType = 'persona' | 'empresa';

export type MaritalStatus = 'single' | 'married' | 'divorced' | 'widowed' | '';

export type ManagementType = 'manager-managed' | 'member-managed' | '';

export type TaxClassification = 'pass-through' | 'corporation' | '';

export type OperativeAddressOption = 'si' | 'no' | 'sci' | '';

export interface Member {
	id: string;
	tipoSocio: MemberType;
	nombreCompleto: string;
	correo: string;
	estadoCivil: MaritalStatus;
	porcentaje: number;
	residenteFiscalEEUU: boolean;
	/** File se guarda en memoria mientras el wizard está activo. No persiste en localStorage. */
	pasaporte: File | null;
	numeroPasaporte: string;
	nacionalidad: string;
	ssn: string;
	itin: string;
	facturaServicio: File | null;
	paisFactura: string;
	direccion: string;
}

export interface Manager {
	id: string;
	nombre: string;
	correo: string;
	residenteFiscal: boolean;
	itin: string;
	ssn: string;
	pasaporte: File | null;
	numeroPasaporte: string;
	nacionalidad: string;
	mismaDireccionEmpresa: boolean;
	paisResidencia: string;
	direccion: string;
	facturaServicio: File | null;
}

export interface ClientFormData {
	// Step 2 — Activity
	ingresosEEUU: boolean | null;
	/**
	 * Id de la actividad (FK a tabla `activity`).
	 * Vacío cuando `actividadNoEnLista === true` — en ese caso aplican
	 * `descripcionActividad` y `codigoActividad` (IRS code).
	 */
	actividad: string;
	actividadNoEnLista: boolean;
	descripcionActividad: string;
	codigoActividad: string;
	formaAdministracion: ManagementType;
	formaTributacion: TaxClassification;
	direccionOperativaEEUU: OperativeAddressOption;

	// US Address (si direccionOperativaEEUU === 'si')
	direccion: string;
	condado: string;
	ciudad: string;
	estado: string;
	codigoPostal: string;

	// US Address — utility bill
	facturaServicioBasicoEEUU: File | null;

	// Non-US Address (si direccionOperativaEEUU === 'no')
	pais: string;
	direccionEmpresa: string;
	facturaServicioBasico: File | null;

	// Step 3 — Members
	miembros: Member[];
	informacionMiembrosPublica: boolean;

	// Step 4 — Manager
	managerSCI: boolean | null;
	managerEsMiembro: boolean | null;
	seleccionManagers: string[]; // ids de miembros que serán manager
	agregarOtrosSocios: boolean;
	managers: Manager[];
	informacionManagersPublica: boolean;
	responsableIRS: string; // id de miembro

	// Step 5 — Confirmation
	firma: string | null; // dataURL del canvas
	aceptaTerminos: boolean;
}

/**
 * Subset de ClientFormData seguro para serializar en localStorage.
 * Excluye File porque no es JSON-serializable.
 */
export type SerializableMember = Omit<Member, 'pasaporte' | 'facturaServicio'>;
export type SerializableManager = Omit<Manager, 'pasaporte' | 'facturaServicio'>;
export interface SerializableClientFormData
	extends Omit<
		ClientFormData,
		'miembros' | 'managers' | 'facturaServicioBasico' | 'facturaServicioBasicoEEUU'
	> {
	miembros: SerializableMember[];
	managers: SerializableManager[];
}

export interface StepMeta {
	id: StepId;
	title: string;
	/** Nombre de icono iconify (ej: 'ri:building-2-line'). */
	icon: string;
}
