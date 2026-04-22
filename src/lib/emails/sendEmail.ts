import { sendMail } from '@lib/mailing/mailer';

export type SendEmailInput = {
	to: string;
	subject: string;
	html: string;
};

export type SendEmailResult = {
	status: number;
	success: boolean;
	body: object;
};


export async function sendEmail({
	to,
	subject,
	html,
}: SendEmailInput): Promise<SendEmailResult> {
	try {
		await sendMail({
			to,
			subject,
			html,
		});

		// Redireccionar a la página anterior con flag de éxito
		return {
			status: 200,
			success: true,
			body: {
				message: 'El correo ha sido enviado',
			},
		}

	} catch (error: any) {
		console.error('[EmailAPI] Error enviando:', error);

		// Redireccionar con el mensaje de error para mostrarlo en el componente
		// Nota: En producción evita enviar error.message crudo si contiene datos sensibles
		return {
			status: 500,
			success: false,
			body: {
				message: 'Error al enviar el mensaje',
			},
		}
	}
};
