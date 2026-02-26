import { apiClient } from './axios-odoo-instance';

/**
 * Calls Odoo's `execute_kw` JSON-RPC method.
 *
 * @param model  - Odoo model name, e.g. `"res.partner"`
 * @param method - Method to call, e.g. `"search_read"`, `"create"`, `"read"`
 * @param args   - Positional arguments (array)
 * @param kwargs - Keyword arguments (object), e.g. `{ fields: [...], limit: 10 }`
 */
export async function executeKw(
	model: string,
	method: string,
	args: unknown[] = [],
	kwargs: Record<string, unknown> = {},
): Promise<unknown> {
	const { data } = await apiClient.post('/execute_kw', {
		model,
		method,
		args,
		kwargs,
	});

	return data?.result ?? data;
}
