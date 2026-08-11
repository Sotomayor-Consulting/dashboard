export type ActorRole = 'admin' | 'operaciones' | 'cliente';

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
	caseId: string | null;
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
	shareWithUserId?: string | null;
	/**
	 * Comparte el documento con el cliente al subirlo. Sustituye a la antigua
	 * columna `visibility`: un documento es visible para el cliente si y solo
	 * si existe un share activo.
	 */
	autoShare: boolean;
	isSigned?: boolean;
}

export interface UploadDocumentResult {
	documentId: string;
	caseId: string | null;
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
	caseId: string | null;
}

export class DocumentsError extends Error {
	status: number;

	constructor(status: number, message: string) {
		super(message);
		this.status = status;
	}
}
