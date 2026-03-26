import type { APIRoute } from 'astro';
import nodemailer from 'nodemailer';

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


	const transporter = nodemailer.createTransport({
		host: import.meta.env.SMTP_SERVER, // smtp-relay.brevo.com
		port: Number(import.meta.env.SMTP_PORT), // 587
		secure: false, // true para port 465, false para otros puertos
		auth: {
			user: import.meta.env.SMTP_USER,
			pass: import.meta.env.SMTP_PASSWORD,
		},
		// Añade esta configuración para evitar el error de certificado
		tls: {
			rejectUnauthorized: false,
		},
	});

	try {
		await transporter.sendMail({
			from: `"${import.meta.env.EMAIL_FROM_NAME}" <${import.meta.env.EMAIL_FROM}>`, // Asegúrate de usar tu usuario SMTP o un correo verificado en Brevo
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
			success: true,
			body: {
				message: 'Error al enviar el mensaje',
			},
		}
	}
};
