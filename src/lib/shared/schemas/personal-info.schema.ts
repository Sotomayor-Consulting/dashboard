import * as z from "zod"; 

/**
 * Schema de validación para el formulario de información personal.
 * Compartido entre client-side y server-side.
 *
 * Los campos opcionales usan `nullish()` → aceptan undefined, null y "".
 * Los preTransform con `.or(z.literal(''))` permiten enviar string vacío
 * desde el form sin fallar la validación en campos opcionales.
 */
export const personalInfoSchema = z.object({
	nombre: z
		.string({ error: 'El nombre es requerido' })
		.min(2, { error: 'El nombre debe tener al menos 2 caracteres' })
		.max(100, { error: 'El nombre no puede exceder 100 caracteres' }),

	apellido: z
		.string({ error: 'El apellido es requerido' })
		.min(2, { error: 'El apellido debe tener al menos 2 caracteres' })
		.max(100, { error: 'El apellido no puede exceder 100 caracteres' }),

	pais: z
		.string({ error: 'Seleccione un país' })
		.min(1, { error: 'Seleccione un país' }),

	ciudad: z
		.string({ error: 'La ciudad es requerida' })
		.min(2, { error: 'La ciudad debe tener al menos 2 caracteres' })
		.max(100, { error: 'La ciudad no puede exceder 100 caracteres' }),

	direccion: z
		.string({ error: 'La dirección es requerida' })
		.min(3, { error: 'La dirección debe tener al menos 3 caracteres' })
		.max(200, { error: 'La dirección no puede exceder 200 caracteres' }),

	direccion2: z
		.string()
		.max(200, { error: 'La dirección no puede exceder 200 caracteres' })
		.optional()
		.or(z.literal('')),

	tipo_de_documento: z
		.enum(['Cédula', 'RUC', 'ID', 'Pasaporte', 'EIN'], {
			error: 'Seleccione un tipo de documento válido',
		}),

	Numero_de_identificacion: z
		.string({ error: 'El número de identificación es requerido' })
		.min(3, {
			error: 'El número de identificación debe tener al menos 3 caracteres',
		})
		.max(30, {
			error: 'El número de identificación no puede exceder 30 caracteres',
		}),

	tipo_de_persona: z
		.enum(['Natural', 'Jurídica'], {
			error: 'Seleccione un tipo de persona válido',
		}),
	fecha_nacimiento: z
		.string()
		.optional()
		.or(z.literal('')),

	organizacion: z
		.string()
		.max(150, {
			error: 'La organización no puede exceder 150 caracteres',
		})
		.optional()
		.or(z.literal('')),
	cargo: z
		.string()
		.max(100, { error: 'El cargo no puede exceder 100 caracteres' })
		.optional()
		.or(z.literal('')),

	departamento: z
		.string()
		.max(100, {
			error: 'El departamento no puede exceder 100 caracteres',
		})
		.optional()
		.or(z.literal('')),

	codigo_postal: z
		.string()
		.max(20, {
			error: 'El código postal no puede exceder 20 caracteres',
		})
		.optional()
		.or(z.literal('')),
});

/** Tipo inferido del schema para reutilizar en componentes */
export type PersonalInfoData = z.infer<typeof personalInfoSchema>;
