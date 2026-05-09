export type ActorRole = 'admin' | 'operaciones' | 'cliente';

export type DocumentVisibility = 'internal_only' | 'client_visible';

export type DocumentRelatedType =
	| 'user'
	| 'profile'
	| 'member'
	| 'company'
	| 'incorporation_case'
	| 'workflow'
	| 'task'
	| 'stage';

export interface DocumentActor {
	userId: string;
	userRoles: string[];
	isStaff: boolean;
	actorRole: ActorRole;
}

export interface CaseOwnerRow {
	caseId: string;
	ownerUserId: string;
	caseName: string | null;
}

export interface UploadDocumentInput {
	file: File;
	documentTypeId?: number | null;
	documentRequestId?: string | null;
	relatedToType: DocumentRelatedType;
	relatedToId: string;
	caseId?: string | null;
	visibility: DocumentVisibility;
	shareWithUserId?: string | null;
	autoShare: boolean;
}

export interface UploadDocumentResult {
	documentId: string;
	caseId: string;
	ownerUserId: string;
	caseName: string | null;
}

export interface CreateDocumentRequestInput {
	documentTypeId: number;
	relatedToType: DocumentRelatedType;
	relatedToId: string;
	caseId?: string | null;
	dueDate?: string | null;
	message?: string | null;
	isRequired?: boolean;
	status?: string;
}

export interface CreateDocumentRequestResult {
	requestId: string;
	caseId: string;
}

export class DocumentsError extends Error {
	status: number;

	constructor(status: number, message: string) {
		super(message);
		this.status = status;
	}
}
