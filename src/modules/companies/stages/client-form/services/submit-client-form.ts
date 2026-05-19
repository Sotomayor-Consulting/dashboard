import type { ClientFormData } from '../types';

export interface SubmitClientFormResult {
	ok: boolean;
	message?: string;
	redirectTo?: string;
}

/**
 * STUB. Cuando definamos el endpoint:
 * 1. Subir archivos a Supabase Storage (pasaportes + facturas).
 * 2. POST a /api/incorporations/... con el payload sin Files.
 * 3. Devolver `redirectTo` para que el wizard navegue tras éxito.
 *
 * Por ahora solo loguea y simula éxito.
 */
export async function submitClientForm(
	data: ClientFormData,
	context: { empresaId: string },
): Promise<SubmitClientFormResult> {
	if (import.meta.env.DEV) {
		console.info('[client-form] submit (stub)', { empresaId: context.empresaId, data });
	}

	// TODO: implementar upload de archivos + POST al backend.
	await new Promise((resolve) => setTimeout(resolve, 250));

	return {
		ok: true,
		redirectTo: '/?status=success&msg=Tu formulario se subió correctamente.',
	};
}
