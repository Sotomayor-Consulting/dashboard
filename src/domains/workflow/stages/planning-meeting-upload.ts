import { supabaseAdmin } from '@infrastructure/supabase/admin';
import {
	DOCUMENT_TYPE_SLUGS,
	DocumentsError,
	getDocumentTypeIdBySlug,
	uploadDocument,
	type DocumentActor,
	type UploadDocumentResult,
} from '@domains/documents';

const documentsDb = supabaseAdmin.schema('documents');

interface PreviousPlanningDoc {
	id: string;
	version: number;
	document_group_id: string | null;
}

const findLatestPlanningDoc = async (
	caseId: string,
): Promise<PreviousPlanningDoc | null> => {
	// La relación documento → caso vive en document_links desde que se eliminó
	// documents.documents.case_id.
	const { data: links, error: linksError } = await documentsDb
		.from('document_links')
		.select('document_id')
		.eq('related_to_type', 'incorporation_case')
		.eq('related_to_id', caseId);

	if (linksError) {
		throw new DocumentsError(500, 'Error consultando documentos previos');
	}

	const ids = (links ?? []).map((link) => link.document_id as string);
	if (ids.length === 0) return null;

	const { data, error } = await documentsDb
		.from('documents')
		.select('id, version, document_group_id')
		.in('id', ids)
		.eq(
			'document_type_id',
			await getDocumentTypeIdBySlug(DOCUMENT_TYPE_SLUGS.planningDesignReport),
		)
		.neq('status', 'archived')
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
		throw new DocumentsError(
			403,
			'Solo operaciones puede subir este documento',
		);
	}

	const previous = await findLatestPlanningDoc(input.caseId);

	const result = await uploadDocument(actor, {
		file: input.file,
		documentTypeId: await getDocumentTypeIdBySlug(
			DOCUMENT_TYPE_SLUGS.planningDesignReport,
		),
		relatedToType: 'incorporation_case',
		relatedToId: input.caseId,
		caseId: input.caseId,
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
