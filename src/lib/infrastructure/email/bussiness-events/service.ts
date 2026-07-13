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
	BusinessEmailRecipientRole,
	BusinessEmailPayload,
	SendBusinessEmailResult,
} from './types';

type DeliveryFailure = {
	userId: string;
	email: string;
	role: BusinessEmailRecipientRole;
	error: string;
};

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
			debug: {
				resolvedRecipients: [],
				failures: [
					{
						userId: '',
						email: '',
						role: 'client',
						error: 'CASE_CONTEXT_NOT_FOUND',
					},
				],
			},
		};
	}

	const [operationsRecipients] = await Promise.all([
		resolveOperationsRecipients(),
	]);
	const clientRecipient = payload.clientEmailOverride?.trim()
		? {
				userId: context.clientUserId,
				email: payload.clientEmailOverride.trim(),
				name: context.clientName,
				role: 'client' as const,
			}
		: buildClientRecipient(context);
	const allRecipients: BusinessEmailRecipient[] = clientRecipient
		? [clientRecipient, ...operationsRecipients]
		: operationsRecipients;
	const recipients = dedupeBusinessRecipients(allRecipients);

	if (recipients.length === 0) {
		return {
			eventKey: payload.eventKey,
			totalRecipients: 0,
			totalSent: 0,
			totalFailed: 0,
			debug: {
				resolvedRecipients: [],
				failures: [
					{
						userId: context.clientUserId,
						email: '',
						role: 'client',
						error: 'NO_RECIPIENTS_RESOLVED',
					},
				],
			},
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
	const failures: DeliveryFailure[] = [];

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
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			failures.push({
				userId: recipient.userId,
				email: recipient.email,
				role: recipient.role,
				error: errorMessage,
			});
			console.error('[business-email] delivery failed', {
				eventKey: payload.eventKey,
				userId: recipient.userId,
				email: recipient.email,
				role: recipient.role,
				error: errorMessage,
			});
		}
	}

	return {
		eventKey: payload.eventKey,
		totalRecipients: recipients.length,
		totalSent,
		totalFailed,
		debug: {
			resolvedRecipients: recipients.map((recipient) => ({
				userId: recipient.userId,
				email: recipient.email,
				role: recipient.role,
			})),
			failures,
		},
	};
}

export async function sendWorkflowTaskCompletedEmail(
	taskId: string,
	actionUrl?: string | null,
	clientEmailOverride?: string | null,
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
			debug: {
				resolvedRecipients: [],
				failures: [
					{
						userId: '',
						email: '',
						role: 'client',
						error: error?.message ?? 'TASK_OR_CASE_NOT_FOUND',
					},
				],
			},
		};
	}

	return deliverBusinessEmail(
		withNullableField(
			withNullableField(
				{
					eventKey: 'workflow.task.completed',
					caseId: data.incorporation_id as string,
					taskName: (data.title as string | null) ?? null,
				},
				'actionUrl',
				actionUrl,
			),
			'clientEmailOverride',
			clientEmailOverride,
		),
	);
}

export async function sendDocumentRequestedEmail(input: {
	caseId: string;
	actionUrl?: string | null;
	message?: string | null;
	dueDate?: string | null;
	clientEmailOverride?: string | null;
}): Promise<SendBusinessEmailResult> {
	return deliverBusinessEmail(
		withNullableField(
			withNullableField(
				withNullableField(
					withNullableField(
						{
							eventKey: 'documents.requested',
							caseId: input.caseId,
						},
						'actionUrl',
						input.actionUrl,
					),
					'message',
					input.message,
				),
				'clientEmailOverride',
				input.clientEmailOverride,
			),
			'dueDate',
			input.dueDate,
		),
	);
}

export async function sendDocumentSharedEmail(input: {
	caseId: string;
	actionUrl?: string | null;
	clientEmailOverride?: string | null;
}): Promise<SendBusinessEmailResult> {
	return deliverBusinessEmail(
		withNullableField(
			withNullableField(
				{
					eventKey: 'documents.shared',
					caseId: input.caseId,
				},
				'actionUrl',
				input.actionUrl,
			),
			'clientEmailOverride',
			input.clientEmailOverride,
		),
	);
}

export async function sendIncorporationSubmittedEmail(input: {
	caseId: string;
	actionUrl?: string | null;
	clientEmailOverride?: string | null;
}): Promise<SendBusinessEmailResult> {
	return deliverBusinessEmail(
		withNullableField(
			withNullableField(
				{
					eventKey: 'incorporation.submitted',
					caseId: input.caseId,
				},
				'actionUrl',
				input.actionUrl,
			),
			'clientEmailOverride',
			input.clientEmailOverride,
		),
	);
}

export async function sendIncorporationValidatedEmail(input: {
	caseId: string;
	actionUrl?: string | null;
	clientEmailOverride?: string | null;
}): Promise<SendBusinessEmailResult> {
	return deliverBusinessEmail(
		withNullableField(
			withNullableField(
				{
					eventKey: 'incorporation.validated',
					caseId: input.caseId,
				},
				'actionUrl',
				input.actionUrl,
			),
			'clientEmailOverride',
			input.clientEmailOverride,
		),
	);
}

export async function sendPaymentSucceededEmail(input: {
	caseId: string;
	actionUrl?: string | null;
	serviceName?: string | null;
	clientEmailOverride?: string | null;
}): Promise<SendBusinessEmailResult> {
	return deliverBusinessEmail(
		withNullableField(
			withNullableField(
				withNullableField(
					{
						eventKey: 'payment.succeeded',
						caseId: input.caseId,
					},
					'actionUrl',
					input.actionUrl,
				),
				'serviceName',
				input.serviceName,
			),
			'clientEmailOverride',
			input.clientEmailOverride,
		),
	);
}

export async function sendPaymentSucceededEmailByPaymentIntent(
	paymentIntentId: string,
): Promise<SendBusinessEmailResult> {
	const { data: payment, error } = await supabaseAdmin
		.schema('orders')
		.from('payments')
		.select(
			`order:order_id!inner (
			   incorporation_id,
			   order_lines ( service_plan_id, service_plan_name )
			 )`,
		)
		.eq('provider_transaction_id', paymentIntentId)
		.order('created_at', { ascending: false })
		.limit(1)
		.maybeSingle();

	const order = (
		payment as unknown as {
			order?: {
				incorporation_id: string | null;
				order_lines?: Array<{
					service_plan_id: number | null;
					service_plan_name: string | null;
				}>;
			} | null;
		} | null
	)?.order;
	const incorporationId = order?.incorporation_id ?? null;
	const planLine = order?.order_lines?.find((l) => l.service_plan_id != null);
	const data = incorporationId
		? {
				empresa_incorporacion_id: incorporationId,
				servicios: {
					nombre: planLine?.service_plan_name ?? null,
				},
			}
		: null;

	if (error || !data?.empresa_incorporacion_id) {
		return {
			eventKey: 'payment.succeeded',
			totalRecipients: 0,
			totalSent: 0,
			totalFailed: 0,
			debug: {
				resolvedRecipients: [],
				failures: [
					{
						userId: '',
						email: '',
						role: 'client',
						error: error?.message ?? 'PAYMENT_OR_CASE_NOT_FOUND',
					},
				],
			},
		};
	}

	return sendPaymentSucceededEmail({
		caseId: data.empresa_incorporacion_id as string,
		actionUrl: `/my-companies/${data.empresa_incorporacion_id}/dashboard`,
		serviceName:
			(data.servicios as { nombre?: string | null } | null)?.nombre ?? null,
	});
}

export async function sendFormSubmittedEmail(input: {
	caseId: string;
	actionUrl?: string | null;
	clientEmailOverride?: string | null;
}): Promise<SendBusinessEmailResult> {
	return deliverBusinessEmail(
		withNullableField(
			withNullableField(
				{
					eventKey: 'form.submitted',
					caseId: input.caseId,
				},
				'actionUrl',
				input.actionUrl,
			),
			'clientEmailOverride',
			input.clientEmailOverride,
		),
	);
}
