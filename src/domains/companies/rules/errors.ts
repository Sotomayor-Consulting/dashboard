/**
 * Error tipado para reglas de negocio. Los API routes deben mapearlo a HTTP 422
 * y los hooks/UI deben mostrar el `message` como toast.error.
 */
export class BusinessRuleError extends Error {
	readonly code: string;
	constructor(code: string, message: string) {
		super(message);
		this.name = 'BusinessRuleError';
		this.code = code;
	}
}
