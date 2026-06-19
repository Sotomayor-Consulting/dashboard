import { z } from 'zod';

import { fileRefSchema } from './file-ref.schema';

export const confirmationStepSchema = z.object({
	firma: z
		.string({ error: 'Dibuja tu firma para continuar' })
		.min(1, 'Dibuja tu firma para continuar'),
	firmaPath: z.string().nullable().default(null),
	firmaRef: fileRefSchema.default(null),
	aceptaTerminos: z.literal(true, {
		error: 'Debes aceptar los términos y condiciones',
	}),
});

export type ConfirmationStepInput = z.infer<typeof confirmationStepSchema>;
