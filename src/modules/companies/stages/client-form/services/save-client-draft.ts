// Autosave write-through del borrador al staging (workflow.incorporation_forms).
// Es best-effort: localStorage sigue siendo la red de seguridad local, el
// servidor es la fuente de verdad cross-device y para los tableros de Operaciones.

import type { ClientFormData } from '../types';
import {
	computeFormProgress,
	stepLabel,
	toIncorporationFormPayload,
} from '../payload';

export async function saveClientDraft(
	data: ClientFormData,
	ctx: { incorporationId: string; step: number },
): Promise<void> {
	try {
		await fetch(`/api/incorporations/${ctx.incorporationId}/form`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				payload: toIncorporationFormPayload(data),
				progress: computeFormProgress(data),
				currentStep: stepLabel(ctx.step),
			}),
		});
	} catch {
		/* best-effort: el draft local cubre el caso de fallo de red */
	}
}
