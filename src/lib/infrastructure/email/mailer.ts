import nodemailer from 'nodemailer';
import { createLogger } from '@infrastructure/logging';

const log = createLogger('Mailer');

const firstDefined = (...values: Array<string | undefined>) => {
	for (const value of values) {
		if (typeof value !== 'string') continue;
		const trimmed = value.trim();
		if (trimmed && trimmed !== '*') return trimmed;
	}
	return undefined;
};

const SMTP_HOST = firstDefined(
	import.meta.env.SMTP_HOST,
	import.meta.env.BREVO_SMTP_HOST,
	import.meta.env.SMTP_SERVER,
	import.meta.env.MAIL_HOST,
);
const SMTP_USER = firstDefined(
	import.meta.env.SMTP_USER,
	import.meta.env.BREVO_SMTP_USER,
	import.meta.env.MAIL_USER,
);
const SMTP_PASS = firstDefined(
	import.meta.env.SMTP_PASS,
	import.meta.env.SMTP_PASSWORD,
	import.meta.env.BREVO_SMTP_PASSWORD,
	import.meta.env.MAIL_PASS,
);
const EMAIL_FROM = firstDefined(
	import.meta.env.EMAIL_FROM,
	import.meta.env.BREVO_SMTP_FROM_EMAIL,
	import.meta.env.MAIL_FROM,
);
const SMTP_PORT = Number(
	firstDefined(
		import.meta.env.SMTP_PORT,
		import.meta.env.BREVO_SMTP_PORT,
		import.meta.env.MAIL_PORT,
	) || '587',
);
const EMAIL_FROM_NAME = firstDefined(
	import.meta.env.EMAIL_FROM_NAME,
	import.meta.env.BREVO_SMTP_FROM_NAME,
);

if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS || !EMAIL_FROM) {
	throw new Error(
		'Missing SMTP env vars. Configure SMTP_* or BREVO_SMTP_* credentials.',
	);
}

const MAIL_FROM = !EMAIL_FROM_NAME
	? EMAIL_FROM
	: `"${EMAIL_FROM_NAME}" <${EMAIL_FROM}>`;

export const transporter = nodemailer.createTransport({
	host: SMTP_HOST,
	port: SMTP_PORT,
	secure: false,
	auth: {
		user: SMTP_USER,
		pass: SMTP_PASS,
	},
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
		log.error('Error in sendMail', { err });
		throw err;
	}
}
