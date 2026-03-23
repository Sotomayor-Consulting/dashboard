import type { APIRoute } from 'astro';
import * as operations from '../../services/index.js';
import { createSupabaseServerClient } from '@lib/supabase/server.js';
import { SECURITY_HEADERS } from '@lib/security/headers.js';

/* SSR mode: no prerender, no getStaticPaths needed */
export const prerender = false;

/* Map REST API endpoints to internal operations
  (GETs only for illustration purpose) */
export const endpointsToOperations = {
	products: operations.getProducts,
	users: operations.getUsers,
};

function parseTypeParam(endpoint: string | undefined) {
	if (!endpoint || !(endpoint in endpointsToOperations)) return undefined;
	return endpoint as keyof typeof endpointsToOperations;
}

/* Controllers — Astro 5 usa nombres en MAYÚSCULAS para los métodos HTTP */

export const GET: APIRoute = async ({ params, request, cookies }) => {
	const supabase = createSupabaseServerClient({ headers: request.headers, cookies });
	const { data: { user }, error } = await supabase.auth.getUser();
	if (error || !user) {
		return new Response(JSON.stringify({ error: 'Unauthorized' }), {
			status: 401,
			headers: SECURITY_HEADERS,
		});
	};
	// console.log('Hit!', params.entity);
	const operationName = parseTypeParam(params.entity);

	if (!operationName) return new Response('404', { status: 404 });

	const body = endpointsToOperations[operationName]();

	return new Response(JSON.stringify(body), {
		status: 200,
		headers: SECURITY_HEADERS,
	});
};
