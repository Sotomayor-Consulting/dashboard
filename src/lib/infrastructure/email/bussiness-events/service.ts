import { sendMail } from '@infrastructure/email/mailer';
import { supabaseAdmin } from '@infrastructure/supabase/admin';
import {
	buildClientRecipient,
	dedupeBusinessRecipients,
	resolveBusinessCaseContext,
	resolveOperationsRecipients,
} from './recipients';
import { renderBusinessEmailHtml } from './renderer';
import { buildBusinessEmailTemplate } from './templates';
import type {
	BusinessEmailRecipient,
	BusinessEmailPayload,
	SendBusinessEmailResult,
} from './types';

function withNullableField<T extends object>(
	base: T,
	key: string,
	value: string | null | undefined,
): T & Record<string, string | null> {
	if (value === undefined) return base as T & Record<string, string | null>;
	return {
		...base,
		[key]: value,
	};
}

async function deliverBusinessEmail(
	payload: BusinessEmailPayload,
): Promise<SendBusinessEmailResult> {
	const context = await resolveBusinessCaseContext(payload.caseId);
	if (!context) {
		return {
			eventKey: payload.eventKey,
			totalRecipients: 0,
			totalSent: 0,
			totalFailed: 0,
		};
	}

	const [operationsRecipients] = await Promise.all([
		resolveOperationsRecipients(),
	]);
	const clientRecipient = buildClientRecipient(context);
	const allRecipients: BusinessEmailRecipient[] = clientRecipient
		? [clientRecipient, ...operationsRecipients]
		: operationsRecipients;
	const recipients = dedupeBusinessRecipients(
		allRecipients,
	);

	if (recipients.length === 0) {
		return {
			eventKey: payload.eventKey,
			totalRecipients: 0,
			totalSent: 0,
			totalFailed: 0,
		};
	}

	const template = buildBusinessEmailTemplate(payload, context);
	const html = renderBusinessEmailHtml({
		title: template.title,
		intro: template.intro,
		highlight_label: template.highlightLabel,
		highlight_value: template.highlightValue,
		details: template.details,
		cta_note: template.ctaNote,
		cta_label: template.ctaLabel,
		cta_url: template.ctaUrl,
	});

	let totalSent = 0;
	let totalFailed = 0;

	for (const recipient of recipients) {
		try {
			await sendMail({
				to: recipient.email,
				subject: template.subject,
				html,
				text: template.text,
			});
			totalSent += 1;
		} catch (error) {
			totalFailed += 1;
			console.error('[business-email] delivery failed', {
				eventKey: payload.eventKey,
				userId: recipient.userId,
				email: recipient.email,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	return {
		eventKey: payload.eventKey,
		totalRecipients: recipients.length,
		totalSent,
		totalFailed,
	};
}

export async function sendWorkflowTaskCompletedEmail(
	taskId: string,
	actionUrl?: string | null,
): Promise<SendBusinessEmailResult> {
	const { data, error } = await supabaseAdmin
		.schema('workflow' as never)
		.from('incorporation_tasks')
		.select('id, title, incorporation_id')
		.eq('id', taskId)
		.maybeSingle();

	if (error || !data?.incorporation_id) {
		return {
			eventKey: 'workflow.task.completed',
			totalRecipients: 0,
			totalSent: 0,
			totalFailed: 0,
		};
	}

	return deliverBusinessEmail(
		withNullableField({
		eventKey: 'workflow.task.completed',
		caseId: data.incorporation_id as string,
		taskName: (data.title as string | null) ?? null,
		}, 'actionUrl', actionUrl),
	);
}

export async function sendDocumentRequestedEmail(input: {
	caseId: string;
	actionUrl?: string | null;
	message?: string | null;
	dueDate?: string | null;
}): Promise<SendBusinessEmailResult> {
	return deliverBusinessEmail(
		withNullableField(
			withNullableField(
				withNullableField({
		eventKey: 'documents.requested',
		caseId: input.caseId,
				}, 'actionUrl', input.actionUrl),
				'message',
				input.message,
			),
			'dueDate',
			input.dueDate,
		),
	);
}

export async function sendDocumentSharedEmail(input: {
	caseId: string;
	actionUrl?: string | null;
}): Promise<SendBusinessEmailResult> {
	return deliverBusinessEmail(
		withNullableField({
		eventKey: 'documents.shared',
		caseId: input.caseId,
		}, 'actionUrl', input.actionUrl),
	);
}

export async function sendIncorporationSubmittedEmail(input: {
	caseId: string;
	actionUrl?: string | null;
}): Promise<SendBusinessEmailResult> {
	return deliverBusinessEmail(
		withNullableField({
		eventKey: 'incorporation.submitted',
		caseId: input.caseId,
		}, 'actionUrl', input.actionUrl),
	);
}

export async function sendIncorporationValidatedEmail(input: {
	caseId: string;
	actionUrl?: string | null;
}): Promise<SendBusinessEmailResult> {
	return deliverBusinessEmail(
		withNullableField({
		eventKey: 'incorporation.validated',
		caseId: input.caseId,
		}, 'actionUrl', input.actionUrl),
	);
}
