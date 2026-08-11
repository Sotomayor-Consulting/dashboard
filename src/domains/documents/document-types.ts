import { supabaseAdmin } from '@infrastructure/supabase/admin';
import { createLogger } from '@infrastructure/logging';
import { DocumentsError } from './types';

const log = createLogger('domains.documents.types');

/**
 * Tipos del catálogo que el código necesita referenciar por nombre propio.
 *
 * Antes se usaban IDs literales (`PLANNING_DESIGN_DOC_TYPE_ID = 5`,
 * `PARTNER_CONTRACT_TYPE_ID = 3`). Coincidían con producción por casualidad:
 * son valores autogenerados, y resembrar el catálogo en un proyecto nuevo los
 * habría desplazado sin que nada fallara de forma visible — los documentos se
 * habrían archivado bajo el tipo equivocado.
 *
 * `documents.document_types.slug` es UNIQUE y NOT NULL, así que es la
 * identidad estable del tipo entre proyectos.
 */
export const DOCUMENT_TYPE_SLUGS = {
	planningDesignReport: 'planning_design_report',
	partnerContract: 'partner_contract',
	other: 'other_generic',
} as const;

export type DocumentTypeSlug =
	(typeof DOCUMENT_TYPE_SLUGS)[keyof typeof DOCUMENT_TYPE_SLUGS];

/**
 * El catálogo es estático (13 filas, solo cambia por migración), así que la
 * resolución slug → id se cachea en memoria del proceso.
 */
const idBySlug = new Map<string, number>();

export async function getDocumentTypeIdBySlug(
	slug: DocumentTypeSlug,
): Promise<number> {
	const cached = idBySlug.get(slug);
	if (cached !== undefined) return cached;

	const { data, error } = await supabaseAdmin
		.schema('documents')
		.from('document_types')
		.select('id')
		.eq('slug', slug)
		.maybeSingle();

	if (error) {
		log.error('No se pudo resolver el tipo de documento', { slug, error });
		throw new DocumentsError(500, 'Error resolviendo el tipo de documento');
	}

	if (!data) {
		log.error('Tipo de documento inexistente en el catálogo', { slug });
		throw new DocumentsError(
			500,
			`El catálogo no tiene el tipo de documento "${slug}"`,
		);
	}

	const id = data.id as number;
	idBySlug.set(slug, id);
	return id;
}
