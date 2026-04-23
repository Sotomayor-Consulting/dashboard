import nodemailer from 'nodemailer';

const SMTP_HOST = import.meta.env.SMTP_HOST
const SMTP_USER = import.meta.env.SMTP_USER
const SMTP_PASS = import.meta.env.SMTP_PASS
const EMAIL_FROM = import.meta.env.EMAIL_FROM
const SMTP_PORT = import.meta.env.SMPT_PORT
const EMAIL_FROM_NAME = import.meta.env.EMAIL_FROM_NAME

if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS || !EMAIL_FROM) {
	throw new Error(
		'Missing SMTP env vars. Configure SMTP_HOST, SMTP_USER, SMTP_PASS, EMAIL_FROM.',
	);
}

const MAIL_FROM = !EMAIL_FROM
	? EMAIL_FROM
	: `"${EMAIL_FROM_NAME}" <${EMAIL_FROM}>`;

export const transporter = nodemailer.createTransport({
	host: SMTP_HOST,
	port: SMTP_PORT,
	secure: false,
	auth: {
		user: SMTP_USER,
		pass: SMTP_PASS,
	}
});

export async function sendMail(opts: {
	to: string;
	subject: string;
	html: string;
	text?: string | undefined;
}) {
	try {
		const info = await transporter.sendMail({
			from: MAIL_FROM,
			to: opts.to,
			subject: opts.subject,
			html: opts.html,
			text: opts.text,
		});
		return info;
	} catch (err) {
		console.error('[Mailer] Error in sendMail:', err);
		throw err;
	}
}
