import { z } from 'zod';

import { MAX_FILE_SIZE } from '../constants';

const fileSchema = z
	.instanceof(File)
	.refine(
		(f) => f.size <= MAX_FILE_SIZE,
		'Archivo demasiado grande (máx. 5 MB)',
	)
	.nullable();

/**
 * Schema base (ZodObject) sin refinements. Útil para componer con otros
 * schemas mediante `.shape` o `.extend()`.
 */
export const activityStepBaseSchema = z.object({
	ingresosEEUU: z.boolean({ error: 'Selecciona una opción' }),
	actividad: z.string(),
	actividadNoEnLista: z.boolean(),
	descripcionActividad: z.string(),
	codigoActividad: z.string(),
	formaAdministracion: z.enum(['manager-managed', 'member-managed'], {
		error: 'Selecciona una forma de administración',
	}),
	formaTributacion: z.enum(['pass-through', 'corporation'], {
		error: 'Selecciona una forma de tributar',
	}),
	direccionOperativaEEUU: z.enum(['si', 'no', 'sci'], {
		error: 'Selecciona una opción',
	}),
	direccion: z.string(),
	condado: z.string(),
	ciudad: z.string(),
	estado: z.string(),
	codigoPostal: z.string(),
	facturaServicioBasicoEEUU: fileSchema,
	pais: z.string(),
	direccionEmpresa: z.string(),
	facturaServicioBasico: fileSchema,
});

/**
 * Refinements del Step 2. Se aplican como funciones reutilizables para
 * poder validar tanto en el step aislado como en el schema completo.
 */
export const activityRefinements: ReadonlyArray<{
	check: (d: z.infer<typeof activityStepBaseSchema>) => boolean;
	message: string;
	path: (string | number)[];
}> = [
	{
		check: (d) => d.actividadNoEnLista || d.actividad.length > 0,
		message: 'Selecciona una actividad o marca "no está en la lista"',
		path: ['actividad'],
	},
	{
		check: (d) => d.descripcionActividad.trim().length >= 10,
		message: 'Describe brevemente tu negocio (mínimo 10 caracteres)',
		path: ['descripcionActividad'],
	},
	{
		// La dirección operativa siempre se solicita (la pregunta sí/no/sci
		// ya no existe; los drafts viejos se normalizan a 'si' al hidratar).
		check: (d) =>
			Boolean(
				d.pais &&
				d.direccion &&
				d.ciudad &&
				(d.pais !== 'Estados Unidos' || (d.estado && d.codigoPostal)),
			),
		message: 'Completa la dirección operativa',
		path: ['direccion'],
	},
	{
		check: (d) => Boolean(d.facturaServicioBasicoEEUU),
		message: 'Sube la planilla de servicio básico que verifique la dirección',
		path: ['facturaServicioBasicoEEUU'],
	},
];

/** Schema usado para validar el Step 2 de forma aislada. */
export const activityStepSchema = activityRefinements.reduce(
	(schema, r) => schema.refine(r.check, { message: r.message, path: r.path }),
	activityStepBaseSchema,
);

export type ActivityStepInput = z.infer<typeof activityStepBaseSchema>;
