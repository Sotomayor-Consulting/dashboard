// src/lib/mailer.ts
import nodemailer from 'nodemailer';

const MAIL_HOST = import.meta.env.MAIL_HOST!;
const MAIL_PORT = Number(import.meta.env.MAIL_PORT || 587);
const MAIL_USER = import.meta.env.MAIL_USER!;
const MAIL_PASS = import.meta.env.MAIL_PASS!;
const MAIL_FROM = import.meta.env.MAIL_FROM!;

export const transporter = nodemailer.createTransport({
	host: MAIL_HOST,
	port: MAIL_PORT,
	secure: MAIL_PORT === 465,
	auth: {
		user: MAIL_USER,
		pass: MAIL_PASS,
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
