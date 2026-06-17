export type BusinessEmailEventKey =
	| 'workflow.task.completed'
	| 'documents.requested'
	| 'documents.shared'
	| 'incorporation.submitted'
	| 'incorporation.validated';

export type BusinessEmailRecipientRole = 'client' | 'operations';

export interface BusinessEmailRecipient {
	userId: string;
	email: string;
	name: string | null;
	role: BusinessEmailRecipientRole;
}

export interface BusinessEmailCaseContext {
	caseId: string;
	companyName: string;
	clientUserId: string;
	clientName: string | null;
	clientEmail: string | null;
}

export interface BusinessEmailPayload {
	eventKey: BusinessEmailEventKey;
	caseId: string;
	actionUrl?: string | null;
	taskName?: string | null;
	message?: string | null;
	dueDate?: string | null;
	clientEmailOverride?: string | null;
}

export interface BusinessEmailTemplateData {
	subject: string;
	title: string;
	intro: string;
	highlightLabel: string;
	highlightValue: string;
	details: string;
	ctaNote: string;
	ctaLabel: string;
	ctaUrl: string;
	text: string;
}

export interface SendBusinessEmailResult {
	eventKey: BusinessEmailEventKey;
	totalRecipients: number;
	totalSent: number;
	totalFailed: number;
	debug?: {
		resolvedRecipients: Array<{
			userId: string;
			email: string;
			role: BusinessEmailRecipientRole;
		}>;
		failures: Array<{
			userId: string;
			email: string;
			role: BusinessEmailRecipientRole;
			error: string;
		}>;
	};
}
