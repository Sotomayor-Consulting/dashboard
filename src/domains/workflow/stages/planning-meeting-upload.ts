import { supabaseAdmin } from '@infrastructure/supabase/admin';
import {
	DocumentsError,
	uploadDocument,
	type DocumentActor,
	type UploadDocumentResult,
} from '@domains/documents';
import { PLANNING_DESIGN_DOC_TYPE_ID } from './planning-meeting';

const documentsDb = supabaseAdmin.schema('documents');

interface PreviousPlanningDoc {
	id: string;
	version: number;
	document_group_id: string | null;
}

const findLatestPlanningDoc = async (
	caseId: string,
): Promise<PreviousPlanningDoc | null> => {
	const { data, error } = await documentsDb
		.from('documents')
		.select('id, version, document_group_id')
		.eq('case_id', caseId)
		.eq('document_type_id', PLANNING_DESIGN_DOC_TYPE_ID)
		.is('deleted_at', null)
		.order('version', { ascending: false })
		.limit(1)
		.maybeSingle();

	if (error) {
		throw new DocumentsError(500, 'Error consultando documentos previos');
	}

	return (data as PreviousPlanningDoc | null) ?? null;
};

export interface UploadPlanningDocumentInput {
	caseId: string;
	file: File;
	notes?: string | null;
}

export interface UploadPlanningDocumentResult extends UploadDocumentResult {
	version: number;
	documentGroupId: string;
	replacedDocumentId: string | null;
}

/**
 * Sube una nueva versión del documento "Planning & Design" para la empresa.
 * Si ya existe una versión previa, comparte `document_group_id`, incrementa
 * `version` y marca la versión anterior como `replaced`.
 */
export const uploadPlanningDocument = async (
	actor: DocumentActor,
	input: UploadPlanningDocumentInput,
): Promise<UploadPlanningDocumentResult> => {
	if (!actor.isStaff) {
		throw new DocumentsError(403, 'Solo operaciones puede subir este documento');
	}

	const previous = await findLatestPlanningDoc(input.caseId);

	const result = await uploadDocument(actor, {
		file: input.file,
		documentTypeId: PLANNING_DESIGN_DOC_TYPE_ID,
		relatedToType: 'incorporation_case',
		relatedToId: input.caseId,
		caseId: input.caseId,
		visibility: 'client_visible',
		autoShare: true,
	});

	const nextVersion = previous ? previous.version + 1 : 1;
	const documentGroupId = previous?.document_group_id ?? result.documentId;

	const updatePayload: Record<string, unknown> = {
		version: nextVersion,
		document_group_id: documentGroupId,
		updated_at: new Date().toISOString(),
		updated_by: actor.userId,
	};
	if (input.notes !== undefined) {
		updatePayload.notes = input.notes;
	}

	const { error: patchErr } = await documentsDb
		.from('documents')
		.update(updatePayload)
		.eq('id', result.documentId);

	if (patchErr) {
		throw new DocumentsError(500, 'Error actualizando versión del documento');
	}

	let replacedDocumentId: string | null = null;
	if (previous) {
		replacedDocumentId = previous.id;
		await documentsDb
			.from('documents')
			.update({
				status: 'replaced',
				updated_at: new Date().toISOString(),
				updated_by: actor.userId,
			})
			.eq('id', previous.id);

		await documentsDb.from('document_events').insert({
			document_id: previous.id,
			case_id: input.caseId,
			event_type: 'replaced',
			from_status: 'uploaded',
			to_status: 'replaced',
			actor_user_id: actor.userId,
			actor_role: actor.actorRole,
			metadata: { replaced_by: result.documentId, new_version: nextVersion },
		});
	}

	return {
		...result,
		version: nextVersion,
		documentGroupId,
		replacedDocumentId,
	};
};
