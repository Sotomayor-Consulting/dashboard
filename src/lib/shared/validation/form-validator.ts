import { z } from 'zod/v4';
import type { ZodType } from 'zod/v4';

/**
 * Resultado de validación genérico.
 * - `success: true`  → `data` contiene los valores parseados.
 * - `success: false` → `fieldErrors` mapea campo → lista de mensajes.
 */
export type ValidationResult<T> =
	| { success: true; data: T }
	| { success: false; fieldErrors: Record<string, string[]> };

/**
 * Valida un objeto plano contra un schema Zod.
 * Reutilizable desde client y server.
 */
export function validateFormData<T>(
	schema: ZodType<T>,
	data: Record<string, unknown>,
): ValidationResult<T> {
	const result = schema.safeParse(data);

	if (result.success) {
		return { success: true, data: result.data };
	}

	const tree = z.treeifyError(result.error) as {
		errors: string[];
		properties?: Record<string, { errors: string[] } | undefined>;
	};
	const fieldErrors: Record<string, string[]> = {};

	if (tree.properties) {
		for (const [key, node] of Object.entries(tree.properties)) {
			if (node && node.errors.length > 0) {
				fieldErrors[key] = node.errors;
			}
		}
	}

	return { success: false, fieldErrors };
}

/**
 * Convierte FormData del browser / API route a un objeto plano
 * con valores string (trim aplicado).
 */
export function formDataToObject(formData: FormData): Record<string, string> {
	const obj: Record<string, string> = {};
	for (const [key, value] of formData.entries()) {
		if (typeof value === 'string') {
			obj[key] = value.trim();
		}
	}
	return obj;
}
