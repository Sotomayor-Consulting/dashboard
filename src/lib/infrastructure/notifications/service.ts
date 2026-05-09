import { findMissingContextKeys, renderTemplate } from './renderer';
import { getNotificationTemplate } from './templates';
import { sendEmailNotification } from './channels/email';
import { sendInAppNotification } from './channels/in-app';
import type {
	NotificationChannel,
	NotificationChannelResult,
	NotificationContext,
	NotificationRecipient,
	NotificationRecipientResult,
	NotifyByEventInput,
	NotifyByEventResult,
} from './types';

function normalizeContext(
	context: NotificationContext = {},
): NotificationContext {
	return context;
}

function dedupeRecipients(
	recipients: NotificationRecipient[],
): NotificationRecipient[] {
	const map = new Map<string, NotificationRecipient>();

	for (const recipient of recipients) {
		if (!recipient?.userId) continue;
		if (!map.has(recipient.userId)) {
			map.set(recipient.userId, recipient);
		}
	}

	return [...map.values()];
}

function resolveChannels(
	requestedChannels: NotificationChannel[] | undefined,
	defaultChannels: NotificationChannel[],
): NotificationChannel[] {
	const channels = requestedChannels?.length
		? requestedChannels
		: defaultChannels;

	return [...new Set(channels)];
}

type RenderedPayload = {
	inAppMessage: string;
	inAppLinkLabel: string;
	emailSubject: string;
	emailHtml: string;
	emailText: string;
};

function buildRenderedPayload(
	input: NotifyByEventInput,
	context: NotificationContext,
	locale?: string,
): { payload: RenderedPayload; channels: NotificationChannel[] } {
	const template = getNotificationTemplate(input.eventKey, locale);
	const channels = resolveChannels(input.channels, template.defaultChannels);

	const sourceInAppMessage =
		input.overrides?.inAppMessage ?? template.inApp.message;
	const sourceInAppLabel =
		input.linkLabel ?? template.inApp.linkLabel ?? 'Ver detalle';

	const sourceEmailSubject =
		input.overrides?.emailSubject ?? template.email?.subject ?? '';
	const sourceEmailHtml =
		input.overrides?.emailHtml ?? template.email?.html ?? '';
	const sourceEmailText =
		input.overrides?.emailText ?? template.email?.text ?? '';

	if (channels.includes('email') && (!sourceEmailSubject || !sourceEmailHtml)) {
		throw new Error(
			`El evento ${input.eventKey} requiere subject/html para el canal email`,
		);
	}

	const templatesToValidate = [sourceInAppMessage, sourceInAppLabel];
	if (channels.includes('email')) {
		templatesToValidate.push(
			sourceEmailSubject,
			sourceEmailHtml,
			sourceEmailText,
		);
	}

	const missing = findMissingContextKeys(
		templatesToValidate,
		context,
		template.requiredContext ?? [],
	);

	if (missing.length > 0) {
		throw new Error(
			`Faltan variables para plantilla ${input.eventKey}: ${missing.join(', ')}`,
		);
	}

	return {
		channels,
		payload: {
			inAppMessage: renderTemplate(sourceInAppMessage, context),
			inAppLinkLabel: renderTemplate(sourceInAppLabel, context),
			emailSubject: renderTemplate(sourceEmailSubject, context),
			emailHtml: renderTemplate(sourceEmailHtml, context),
			emailText: renderTemplate(sourceEmailText, context),
		},
	};
}

async function sendChannelsForRecipient(
	recipient: NotificationRecipient,
	channels: NotificationChannel[],
	rendered: RenderedPayload,
	link: string | null,
	eventKey: string,
): Promise<NotificationRecipientResult> {
	const channelResults: NotificationChannelResult[] = [];

	for (const channel of channels) {
		if (channel === 'in_app') {
			try {
				await sendInAppNotification({
					userId: recipient.userId,
					message: rendered.inAppMessage,
					link,
					linkLabel: rendered.inAppLinkLabel,
				});
				channelResults.push({ channel, success: true });
			} catch (error: any) {
				channelResults.push({
					channel,
					success: false,
					error: error?.message ?? 'Error enviando notificacion in-app',
				});
			}
			continue;
		}

		if (channel === 'email') {
			if (!recipient.email) {
				channelResults.push({
					channel,
					success: false,
					error: 'El destinatario no tiene correo configurado',
				});
				continue;
			}

			try {
				await sendEmailNotification({
					userId: recipient.userId,
					email: recipient.email,
					subject: rendered.emailSubject,
					html: rendered.emailHtml,
					text: rendered.emailText,
				});
				channelResults.push({ channel, success: true });
			} catch (error: any) {
				console.error('[notifications][email] delivery failed', {
					eventKey,
					userId: recipient.userId,
					error: error?.message ?? String(error),
				});
				channelResults.push({
					channel,
					success: false,
					error: error?.message ?? 'Error enviando correo',
				});
			}
		}
	}

	return {
		userId: recipient.userId,
		channels: channelResults,
	};
}

export async function notifyByEvent(
	input: NotifyByEventInput,
): Promise<NotifyByEventResult> {
	const recipients = dedupeRecipients(input.recipients);

	if (recipients.length === 0) {
		return {
			eventKey: input.eventKey,
			totalRecipients: 0,
			totalSuccess: 0,
			totalFailed: 0,
			results: [],
		};
	}

	const context = normalizeContext(input.context);
	const resolvedLink =
		input.link ??
		(typeof context.action_url === 'string' ? context.action_url : null);
	const { channels, payload } = buildRenderedPayload(
		input,
		context,
		input.locale,
	);

	const results: NotificationRecipientResult[] = [];

	for (const recipient of recipients) {
		const result = await sendChannelsForRecipient(
			recipient,
			channels,
			payload,
			resolvedLink,
			input.eventKey,
		);
		results.push(result);
	}

	const totalSuccess = results.reduce((acc, row) => {
		const ok = row.channels.some((channel) => channel.success);
		return acc + (ok ? 1 : 0);
	}, 0);

	return {
		eventKey: input.eventKey,
		totalRecipients: recipients.length,
		totalSuccess,
		totalFailed: recipients.length - totalSuccess,
		results,
	};
}

export async function notifyOne(input: NotifyByEventInput) {
	if (input.recipients.length !== 1) {
		throw new Error('notifyOne requiere un solo destinatario');
	}

	return notifyByEvent(input);
}

export async function notifyMany(input: NotifyByEventInput) {
	return notifyByEvent(input);
}
