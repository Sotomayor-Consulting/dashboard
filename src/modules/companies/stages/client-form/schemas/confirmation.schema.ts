import { z } from 'zod';

export const confirmationStepSchema = z.object({
	firma: z
		.string({ error: 'Dibuja tu firma para continuar' })
		.min(1, 'Dibuja tu firma para continuar'),
	aceptaTerminos: z.literal(true, {
		error: 'Debes aceptar los términos y condiciones',
	}),
});

export type ConfirmationStepInput = z.infer<typeof confirmationStepSchema>;
