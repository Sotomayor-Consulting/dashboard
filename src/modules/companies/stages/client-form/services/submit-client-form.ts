import type { ClientFormData } from '../types';
import { toIncorporationFormPayload } from '../payload';
import type { CountryRefV2 } from '../payload/incorporation-form-payload';

export interface SubmitClientFormResult {
	ok: boolean;
	message?: string;
	redirectTo?: string;
	/** Errores de validación de integridad del servidor (si los hay). */
	details?: string[];
}

/**
 * Submit final del wizard. Proyecta el state al payload v1 y lo envía al
 * endpoint de staging, que valida, sube la firma y marca `submitted`.
 * Los archivos discretos (pasaporte/factura) ya se subieron al seleccionarlos,
 * así que aquí solo viaja JSON (incluida la firma como dataURL).
 */
export async function submitClientForm(
	data: ClientFormData,
	context: { empresaId: string; countries?: ReadonlyArray<CountryRefV2> },
): Promise<SubmitClientFormResult> {
	const payload = toIncorporationFormPayload(data, context.countries);

	try {
		const res = await fetch(
			`/api/incorporations/${context.empresaId}/form/submit`,
			{
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ payload }),
			},
		);
		const result = (await res.json().catch(() => null)) as {
			ok: boolean;
			redirectTo?: string;
			error?: string;
			details?: string[];
		} | null;

		if (!res.ok || !result?.ok) {
			const details = Array.isArray(result?.details)
				? result.details
				: undefined;
			return {
				ok: false,
				message: result?.error ?? 'No se pudo enviar el formulario.',
				...(details && details.length ? { details } : {}),
			};
		}

		return {
			ok: true,
			...(result.redirectTo ? { redirectTo: result.redirectTo } : {}),
		};
	} catch {
		return { ok: false, message: 'Error de red al enviar el formulario.' };
	}
}
