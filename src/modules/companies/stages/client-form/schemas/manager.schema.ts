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

export const managerSchema = z
	.object({
		id: z.string(),
		nombre: z.string().min(1, 'Ingresa el nombre del manager'),
		correo: z.email('Correo inválido'),
		residenteFiscal: z.boolean(),
		itin: z.string(),
		ssn: z.string(),
		pasaporte: fileSchema,
		numeroPasaporte: z.string().min(1, 'Ingresa el número de pasaporte'),
		nacionalidad: z.string().min(1, 'Selecciona la nacionalidad'),
		mismaDireccionEmpresa: z.boolean(),
		// Dirección unificada del manager — solo se valida si NO usa la misma
		// dirección que la empresa. Mismo set de campos que socio/operativa.
		paisResidencia: z.string(),
		direccion: z.string(),
		linea2: z.string(),
		ciudad: z.string(),
		estado: z.string(),
		condado: z.string(),
		codigoPostal: z.string(),
		facturaServicio: fileSchema,
		pasaportePath: z.string().nullable().default(null),
		facturaServicioPath: z.string().nullable().default(null),
		pasaporteRef: fileRefSchema.default(null),
		facturaServicioRef: fileRefSchema.default(null),
	})
	.refine(
		(m) =>
			m.mismaDireccionEmpresa ||
			Boolean(
				m.paisResidencia &&
				m.direccion &&
				m.ciudad &&
				m.estado &&
				m.codigoPostal,
			),
		{
			message:
				'Completa la dirección del manager (país, línea 1, ciudad, estado y código postal) o marca "misma que la empresa".',
			path: ['direccion'],
		},
	);

export type ManagerInput = z.infer<typeof managerSchema>;
