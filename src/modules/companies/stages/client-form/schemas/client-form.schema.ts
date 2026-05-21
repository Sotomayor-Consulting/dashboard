import { z } from 'zod';

import type { ClientFormData } from '../types';
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
 *   · si forma === manager-managed && managerSCI === false debe haber manager.
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
			if (d.formaAdministracion !== 'manager-managed') return true;
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

/**
 * Schema tipado con Input (state mutable del form, permite null/incompleto)
 * distinto de Output (resultado validado y estricto):
 *
 *   - Input  = `ClientFormData`        ← lo que recibe la validación desde RHF
 *   - Output = `BaseClientFormInput`   ← lo que produce el schema tras validar
 *
 * En runtime el schema rechaza valores como `ingresosEEUU: null` (con su
 * mensaje de error), pero a nivel de tipos el resolver debe aceptarlos
 * porque el state del wizard sí los permite mientras el usuario no haya
 * elegido. Esta separación Input/Output es la forma idiomática de modelar
 * un wizard parcialmente lleno con react-hook-form + zod.
 */
export const clientFormSchema: z.ZodType<BaseClientFormInput, ClientFormData> =
	[...activityRefinements, ...crossStepRefinements].reduce<
		z.ZodType<BaseClientFormInput, ClientFormData>
	>(
		(schema, r) =>
			schema.refine(r.check as (d: BaseClientFormInput) => boolean, {
				message: r.message,
				path: r.path,
			}) as z.ZodType<BaseClientFormInput, ClientFormData>,
		baseClientFormSchema as unknown as z.ZodType<
			BaseClientFormInput,
			ClientFormData
		>,
	);

export type ClientFormInput = BaseClientFormInput;
