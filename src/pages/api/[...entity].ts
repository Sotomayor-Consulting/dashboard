import type { APIRoute } from 'astro';
import * as operations from '../../services/index.js';

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

export const GET: APIRoute = ({ params }) => {
	console.log('Hit!', params.entity);

	const operationName = parseTypeParam(params.entity);

	if (!operationName) return new Response('404', { status: 404 });

	const body = endpointsToOperations[operationName]();

	return new Response(JSON.stringify(body), {
		status: 200,
		headers: {
			'Content-Type': 'application/json',
		},
	});
};
