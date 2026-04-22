import nodemailer from 'nodemailer';

function pickEnv(...values: Array<string | undefined>): string {
	for (const value of values) {
		if (value && value.trim()) return value.trim();
	}
	return '';
}

const SMTP_HOST = pickEnv(
	import.meta.env.BREVO_SMTP_HOST,
	import.meta.env.SMTP_SERVER,
	import.meta.env.MAIL_HOST,
);

const SMTP_PORT = Number(
	pickEnv(
		import.meta.env.BREVO_SMTP_PORT,
		import.meta.env.SMTP_PORT,
		import.meta.env.MAIL_PORT,
	) ||
		'587',
);

const SMTP_USER = pickEnv(
	import.meta.env.BREVO_SMTP_USER,
	import.meta.env.SMTP_USER,
	import.meta.env.MAIL_USER,
);

const SMTP_PASS = pickEnv(
	import.meta.env.BREVO_SMTP_PASSWORD,
	import.meta.env.SMTP_PASSWORD,
	import.meta.env.MAIL_PASS,
);

const SMTP_FROM_EMAIL = pickEnv(
	import.meta.env.BREVO_SMTP_FROM_EMAIL,
	import.meta.env.EMAIL_FROM,
	import.meta.env.MAIL_FROM,
);

const SMTP_FROM_NAME = pickEnv(
	import.meta.env.BREVO_SMTP_FROM_NAME,
	import.meta.env.EMAIL_FROM_NAME,
	'Sotomayor Consulting',
);

if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS || !SMTP_FROM_EMAIL) {
	throw new Error(
		'Missing SMTP env vars. Configure BREVO_SMTP_HOST, BREVO_SMTP_USER, BREVO_SMTP_PASSWORD, BREVO_SMTP_FROM_EMAIL.',
	);
}

const MAIL_FROM = `"${SMTP_FROM_NAME}" <${SMTP_FROM_EMAIL}>`;

export const transporter = nodemailer.createTransport({
	host: SMTP_HOST,
	port: SMTP_PORT,
	secure: SMTP_PORT === 465,
	auth: {
		user: SMTP_USER,
		pass: SMTP_PASS,
	},
});

export async function sendMail(opts: {
	to: string;
	subject: string;
	html: string;
	text?: string;
}) {
	return transporter.sendMail({
		from: MAIL_FROM,
		to: opts.to,
		subject: opts.subject,
		html: opts.html,
		text: opts.text,
	});
}
