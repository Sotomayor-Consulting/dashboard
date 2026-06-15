// Types del wizard de incorporación del cliente.
// Estos tipos describen el estado completo del formulario en memoria.
// La validación detallada vive en `schemas/` (Zod).

export type StepId = 1 | 2 | 3 | 4 | 5;

export type MemberType = 'persona' | 'empresa';

/** Tipo de número de identificación fiscal de un socio persona jurídica. */
export type FiscalIdType = 'ein' | 'ruc' | 'nit' | 'otro' | '';

export type MaritalStatus = 'single' | 'married' | 'divorced' | 'widowed' | '';

export type ManagementType = 'manager-managed' | 'member-managed' | '';

export type TaxClassification = 'pass-through' | 'corporation' | '';

export type OperativeAddressOption = 'si' | 'no' | 'sci' | '';

/**
 * Referencia rica a un archivo ya subido a Storage. Acompaña a la ruta `*Path`
 * (que el UI usa) y es lo que viaja en el payload v2: autodescriptiva, para que
 * Operaciones vea nombre/tamaño/tipo sin tocar Storage. Se captura al subir
 * (desde el `File`) y se rehidrata desde el payload.
 */
export interface FileRef {
	path: string;
	name: string;
	mime: string;
	size: number;
}

export interface Member {
	id: string;
	tipoSocio: MemberType;
	/** Nombres y apellidos (persona) o nombre/razón social (empresa). */
	nombreCompleto: string;
	correo: string;
	estadoCivil: MaritalStatus;
	porcentaje: number;
	residenteFiscalEEUU: boolean;
	/**
	 * File se guarda en memoria mientras el wizard está activo. No persiste
	 * en localStorage. Para empresa es el certificado de existencia.
	 */
	pasaporte: File | null;
	/** Nº de pasaporte (persona) o nº de identificación fiscal (empresa). */
	numeroPasaporte: string;
	nacionalidad: string;
	ssn: string;
	itin: string;
	facturaServicio: File | null;
	paisFactura: string;
	direccion: string;
	/** Solo empresa: tipo del número de identificación (EIN, RUC, Otro). */
	tipoIdentificacionFiscal: FiscalIdType;
	/** Solo empresa: sitio web (opcional). */
	sitioWeb: string;
	/**
	 * Ruta en Supabase Storage del pasaporte/certificado ya subido
	 * (subida-al-seleccionar). Es JSON-safe: persiste en el draft y en el
	 * payload del staging, a diferencia del `File` que solo vive en memoria.
	 */
	pasaportePath?: string | null;
	/** Ruta en Storage de la factura de servicio del socio ya subida. */
	facturaServicioPath?: string | null;
	/** FileRef rico del pasaporte/certificado (para el payload v2). */
	pasaporteRef?: FileRef | null;
	/** FileRef rico de la factura de servicio (para el payload v2). */
	facturaServicioRef?: FileRef | null;
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
	/** Ruta en Storage del pasaporte del manager ya subido. */
	pasaportePath?: string | null;
	/** Ruta en Storage de la factura de servicio del manager ya subida. */
	facturaServicioPath?: string | null;
	/** FileRef rico del pasaporte del manager (para el payload v2). */
	pasaporteRef?: FileRef | null;
	/** FileRef rico de la factura de servicio del manager (para el payload v2). */
	facturaServicioRef?: FileRef | null;
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
	/** Ruta en Storage de la planilla de servicio básico (EE. UU.) ya subida. */
	facturaServicioBasicoEEUUPath?: string | null;
	/** FileRef rico de la planilla de servicio básico (para el payload v2). */
	facturaServicioBasicoEEUURef?: FileRef | null;

	// Non-US Address (si direccionOperativaEEUU === 'no')
	pais: string;
	direccionEmpresa: string;
	facturaServicioBasico: File | null;
	/** Ruta en Storage de la planilla de servicio básico (no-EE. UU.) ya subida. */
	facturaServicioBasicoPath?: string | null;

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
	/**
	 * Ruta en Storage de la firma ya subida. La firma se sube en el submit
	 * (no al vuelo) porque el dataURL muta con cada trazo/tecla.
	 */
	firmaPath?: string | null;
	/** FileRef rico de la firma ya subida (para el payload v2). */
	firmaRef?: FileRef | null;
	aceptaTerminos: boolean;
}

/**
 * Subset de ClientFormData seguro para serializar en localStorage.
 * Excluye File porque no es JSON-serializable.
 */
export type SerializableMember = Omit<Member, 'pasaporte' | 'facturaServicio'>;
export type SerializableManager = Omit<
	Manager,
	'pasaporte' | 'facturaServicio'
>;
export interface SerializableClientFormData extends Omit<
	ClientFormData,
	| 'miembros'
	| 'managers'
	| 'facturaServicioBasico'
	| 'facturaServicioBasicoEEUU'
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
