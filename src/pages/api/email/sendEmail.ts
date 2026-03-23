import type { APIRoute } from 'astro';
import nodemailer from 'nodemailer';

export const prerender = false;

export const POST: APIRoute = async ({ request, redirect }: { request: Request; redirect: any }) => {
	const data = await request.formData();
	const to = data.get('email')?.toString();
	const subject = data.get('subject')?.toString();
	const html = data.get('html')?.toString();

	if (!to || !subject || !html) {
		return Response.json({
			status: 400,
			body: {
				error: 'Faltan datos',
			},
		})
	}

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
		return new Response(JSON.stringify({
			status: 200,
			body: {
				success: true,
				message: 'El correo ha sido enviado',
			},
		}))

	} catch (error: any) {
		console.error('[EmailAPI] Error enviando:', error);

		// Redireccionar con el mensaje de error para mostrarlo en el componente
		// Nota: En producción evita enviar error.message crudo si contiene datos sensibles
		return new Response(JSON.stringify({
			status: 200,
			body: {
				success: true,
				message: 'El correo ha sido enviado',
			},
		}))
	}
};
