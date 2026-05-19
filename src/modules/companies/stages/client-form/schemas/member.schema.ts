import { z } from 'zod';

import { MAX_FILE_SIZE } from '../constants';

const fileSchema = z
	.instanceof(File)
	.refine((f) => f.size <= MAX_FILE_SIZE, 'Archivo demasiado grande (máx. 5 MB)')
	.nullable();

export const memberSchema = z.object({
	id: z.string(),
	tipoSocio: z.enum(['persona', 'empresa']),
	nombreCompleto: z.string().min(1, 'Ingresa el nombre completo'),
	correo: z.email('Correo inválido'),
	estadoCivil: z.enum(['single', 'married', 'divorced', 'widowed']),
	porcentaje: z
		.number()
		.int('El porcentaje debe ser entero')
		.min(1, 'Debe ser mayor a 0')
		.max(100, 'No puede superar 100'),
	residenteFiscalEEUU: z.boolean(),
	pasaporte: fileSchema,
	numeroPasaporte: z.string().min(1, 'Ingresa el número de pasaporte'),
	nacionalidad: z.string().min(1, 'Selecciona la nacionalidad'),
	ssn: z.string(),
	itin: z.string(),
	facturaServicio: fileSchema,
	paisFactura: z.string().min(1, 'Selecciona el país'),
	direccion: z.string().min(1, 'Ingresa la dirección'),
});

export type MemberInput = z.infer<typeof memberSchema>;
