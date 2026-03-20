import type { APIRoute } from 'astro';
import nodemailer from 'nodemailer';

export const prerender = false;

export const POST: APIRoute = async ({ request, redirect }) => {
	const data = await request.formData();
	const to = data.get('to')?.toString();
	const subject = data.get('subject')?.toString();
	const html = data.get('html')?.toString();

	if (!to || !subject || !html)
		return new Response('Faltan datos', { status: 400 });

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
		// return new Response(JSON.stringify({ success: true }), { status: 200 });
		return redirect(`/`);
	} catch (error) {
		// Esto te ayudará a ver errores más detallados en la consola
		return new Response(JSON.stringify({ error: 'Fallo al enviar' }), {
			status: 500,
		});
	}
};
