import { z } from 'zod';

import { MAX_FILE_SIZE } from '../constants';

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
		paisResidencia: z.string(),
		direccion: z.string(),
		facturaServicio: fileSchema,
	})
	.refine(
		(m) =>
			m.mismaDireccionEmpresa ||
			(m.paisResidencia.length > 0 && m.direccion.length > 0),
		{
			message:
				'Completa país y dirección del manager (o marca "misma que la empresa").',
			path: ['direccion'],
		},
	);

export type ManagerInput = z.infer<typeof managerSchema>;
