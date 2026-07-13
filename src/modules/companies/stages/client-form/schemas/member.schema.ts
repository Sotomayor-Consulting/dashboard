import { z } from 'zod';

import { MAX_FILE_SIZE } from '../constants';
import { fileRefSchema } from './file-ref.schema';

const fileSchema = z
	.instanceof(File)
	.refine(
		(f) => f.size <= MAX_FILE_SIZE,
		'Archivo demasiado grande (máx. 5 MB)',
	)
	.nullable();

export const memberSchema = z
	.object({
		id: z.string(),
		tipoSocio: z.enum(['persona', 'empresa']),
		nombreCompleto: z.string(),
		correo: z.email('Correo inválido'),
		// Solo aplica a persona natural; las empresas no tienen estado civil.
		estadoCivil: z.enum(['single', 'married', 'divorced', 'widowed', '']),
		porcentaje: z
			.number()
			.int('El porcentaje debe ser entero')
			.min(1, 'Debe ser mayor a 0')
			.max(100, 'No puede superar 100'),
		residenteFiscalEEUU: z.boolean(),
		pasaporte: fileSchema,
		numeroPasaporte: z.string(),
		// País de nacionalidad (persona) o de constitución (empresa).
		nacionalidad: z.string().min(1, 'Selecciona el país'),
		ssn: z.string(),
		itin: z.string(),
		facturaServicio: fileSchema,
		// Dirección unificada del socio: país + línea 1 + ciudad + estado +
		// código postal obligatorios; línea 2 y condado opcionales.
		paisFactura: z.string().min(1, 'Selecciona el país'),
		direccion: z.string().min(1, 'Ingresa la dirección (línea 1)'),
		linea2: z.string(),
		ciudad: z.string().min(1, 'Ingresa la ciudad'),
		estado: z.string().min(1, 'Ingresa el estado / provincia'),
		condado: z.string(),
		codigoPostal: z.string().min(1, 'Ingresa el código postal'),
		// Solo empresa: tipo de identificación fiscal y sitio web (opcional).
		tipoIdentificacionFiscal: z.enum(['ein', 'ruc', 'nit', 'otro', '']),
		sitioWeb: z.string(),
		pasaportePath: z.string().nullable().default(null),
		facturaServicioPath: z.string().nullable().default(null),
		pasaporteRef: fileRefSchema.default(null),
		facturaServicioRef: fileRefSchema.default(null),
	})
	.refine((m) => m.tipoSocio !== 'persona' || m.nombreCompleto.length > 0, {
		message: 'Ingresa el nombre completo',
		path: ['nombreCompleto'],
	})
	.refine((m) => m.tipoSocio !== 'empresa' || m.nombreCompleto.length > 0, {
		message: 'Ingresa el nombre de la empresa',
		path: ['nombreCompleto'],
	})
	.refine((m) => m.tipoSocio !== 'persona' || m.numeroPasaporte.length > 0, {
		message: 'Ingresa el número de pasaporte',
		path: ['numeroPasaporte'],
	})
	.refine((m) => m.tipoSocio !== 'empresa' || m.numeroPasaporte.length > 0, {
		message: 'Ingresa el número de identificación (EIN, RUC, NIT u otro)',
		path: ['numeroPasaporte'],
	})
	.refine((m) => m.tipoSocio === 'empresa' || m.estadoCivil !== '', {
		message: 'Selecciona el estado civil',
		path: ['estadoCivil'],
	})
	.refine(
		(m) => m.tipoSocio !== 'empresa' || m.tipoIdentificacionFiscal !== '',
		{
			message: 'Selecciona el tipo de identificación (EIN, RUC u otro)',
			path: ['tipoIdentificacionFiscal'],
		},
	);

export type MemberInput = z.infer<typeof memberSchema>;
