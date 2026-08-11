import type { SupabaseClient } from '@supabase/supabase-js';
import { storage } from '@infrastructure/storage';
import { STAFF_ROLES } from './config';
import type { DocumentActor } from './types';

/**
 * Ruta del panel de documentos del cliente para una incorporación.
 *
 * Antes se construía a mano como `/documentos/${caseId}`, una ruta que no
 * existe: los enlaces de los correos y de las notificaciones llevaban a un
 * 404. La real es `/incorporation/[incorporationId]/documents`.
 */
export function clientDocumentsPath(caseId: string): string {
	return `/incorporation/${caseId}/documents`;
}

export function safeFilename(name: string): string {
	return name
		.replace(/[/\\]/g, '_')
		.replace(/\s+/g, '_')
		.replace(/[^\w.\-()]/g, '_');
}

/**
 * Inserta un documento y su document_link como una unidad. document_links es
 * la única forma en que el front encuentra un documento (ver
 * getDocumentsForRelated) — sin esto, un fallo en el segundo insert deja el
 * archivo ya subido y la fila de documents huérfana e invisible para siempre.
 */
export async function insertDocumentWithLink(
	documentsDb: ReturnType<SupabaseClient['schema']>,
	bucket: string,
	storagePath: string,
	documentPayload: Record<string, unknown> & { id: string },
	linkPayload: Record<string, unknown>,
): Promise<void> {
	const { error: insertErr } = await documentsDb
		.from('documents')
		.insert(documentPayload);
	if (insertErr) throw insertErr;

	const { error: linkErr } = await documentsDb
		.from('document_links')
		.insert(linkPayload);
	if (linkErr) {
		await documentsDb.from('documents').delete().eq('id', documentPayload.id);
		await storage.remove(bucket, [storagePath]).catch(() => {});
		throw linkErr;
	}
}

export function isStaffRole(userRoles: string[]): boolean {
	return userRoles.some((role) => STAFF_ROLES.has(role));
}

export function resolveActorRole(
	userRoles: string[],
): DocumentActor['actorRole'] {
	if (userRoles.includes('admin')) return 'admin';
	if (userRoles.includes('operaciones')) return 'operaciones';
	return 'cliente';
}

export function jsonResponse(payload: unknown, status = 200): Response {
	return new Response(JSON.stringify(payload), {
		status,
		headers: { 'Content-Type': 'application/json' },
	});
}
