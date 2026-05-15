export type NotificationChannel = 'email' | 'in_app';

export type NotificationEventKey =
	| 'admin.custom'
	| 'documents.shared'
	| 'documents.share_revoked'
	| 'workflow.stage.completed'
	| 'workflow.task.assigned'
	| 'workflow.planning.doc_uploaded'
	| 'workflow.planning.doc_approved'
	| 'workflow.planning.doc_rejected';

export type NotificationContextValue =
	| string
	| number
	| boolean
	| null
	| undefined;

export type NotificationContext = Record<string, NotificationContextValue>;

export type NotificationRecipient = {
	userId: string;
	email?: string | null;
	locale?: string;
};

export type NotificationTemplate = {
	eventKey: NotificationEventKey;
	locale: string;
	defaultChannels: NotificationChannel[];
	requiredContext?: string[];
	inApp: {
		message: string;
		linkLabel?: string;
	};
	email?: {
		subject: string;
		html: string;
		text?: string;
	};
};

export type NotifyByEventInput = {
	eventKey: NotificationEventKey;
	recipients: NotificationRecipient[];
	context?: NotificationContext;
	channels?: NotificationChannel[];
	locale?: string;
	link?: string | null;
	linkLabel?: string | null;
	overrides?: {
		inAppMessage?: string;
		emailSubject?: string;
		emailHtml?: string;
		emailText?: string;
	};
};

export type NotificationChannelResult = {
	channel: NotificationChannel;
	success: boolean;
	error?: string;
};

export type NotificationRecipientResult = {
	userId: string;
	channels: NotificationChannelResult[];
};

export type NotifyByEventResult = {
	eventKey: NotificationEventKey;
	totalRecipients: number;
	totalSuccess: number;
	totalFailed: number;
	results: NotificationRecipientResult[];
};
