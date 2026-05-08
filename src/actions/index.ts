import { defineAction } from 'astro:actions';
import { z } from 'astro/zod';
import { sendEmail } from '@lib/emails/sendEmail';

export const server = {
	sendEmail: defineAction({
		accept: 'form',
		input: z.object({
			email: z.email('Ingrese un correo válido.'),
			subject: z.string().min(1, 'El asunto es obligatorio.'),
			html: z.string().optional().default(''),
		}),
		handler: async ({ email, subject, html }) => {
			const result = await sendEmail({
				to: email,
				subject,
				html,
			});

			if (!result.success) {
				throw new Error(String(result.status));
			}

			return {
				success: true,
				message: result.status,
			};
		},
	}),
};
