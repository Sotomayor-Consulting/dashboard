import { z } from 'zod';

import {
	activityRefinements,
	activityStepBaseSchema,
} from './activity.schema';
import { confirmationStepSchema } from './confirmation.schema';
import { managerSchema } from './manager.schema';
import { memberSchema } from './member.schema';

/**
 * Schema completo del formulario para el submit final.
 * - Compone los step schemas.
 * - Reaplica refinements del step 2.
 * - Añade reglas cross-step:
 *   · porcentajes de miembros suman 100,
 *   · responsableIRS es id de un miembro,
 *   · si forma === member-managed && managerSCI === false debe haber manager.
 */
const baseClientFormSchema = activityStepBaseSchema.extend({
	miembros: z.array(memberSchema).min(1, 'Agrega al menos un socio'),
	informacionMiembrosPublica: z.boolean(),
	managerSCI: z.boolean().nullable(),
	managerEsMiembro: z.boolean().nullable(),
	seleccionManagers: z.array(z.string()),
	agregarOtrosSocios: z.boolean(),
	managers: z.array(managerSchema),
	informacionManagersPublica: z.boolean(),
	responsableIRS: z.string().min(1, 'Selecciona al responsable frente al IRS'),
	firma: confirmationStepSchema.shape.firma,
	aceptaTerminos: confirmationStepSchema.shape.aceptaTerminos,
});

type BaseClientFormInput = z.infer<typeof baseClientFormSchema>;

const crossStepRefinements: ReadonlyArray<{
	check: (d: BaseClientFormInput) => boolean;
	message: string;
	path: (string | number)[];
}> = [
	{
		check: (d) =>
			d.miembros.reduce((s, m) => s + (m.porcentaje || 0), 0) === 100,
		message: 'Los porcentajes de los socios deben sumar exactamente 100%',
		path: ['miembros'],
	},
	{
		check: (d) => d.miembros.some((m) => m.id === d.responsableIRS),
		message: 'El responsable frente al IRS debe ser uno de los socios',
		path: ['responsableIRS'],
	},
	{
		check: (d) => {
			if (d.formaAdministracion !== 'member-managed') return true;
			if (d.managerSCI === true) return true;
			if (d.managerSCI === false) {
				return d.seleccionManagers.length > 0 || d.managers.length > 0;
			}
			return false;
		},
		message:
			'Define al menos un manager (asignar a SCI, elegir miembros o agregar externos)',
		path: ['managerSCI'],
	},
];

export const clientFormSchema = [
	...activityRefinements,
	...crossStepRefinements,
].reduce(
	(schema, r) =>
		schema.refine(r.check as (d: unknown) => boolean, {
			message: r.message,
			path: r.path,
		}),
	baseClientFormSchema as unknown as z.ZodTypeAny,
);

export type ClientFormInput = BaseClientFormInput;
