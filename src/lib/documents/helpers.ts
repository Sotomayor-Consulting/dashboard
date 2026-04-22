import { STAFF_ROLES } from './config';
import type { DocumentActor } from './types';

export function safeFilename(name: string): string {
	return name
		.replace(/[/\\]/g, '_')
		.replace(/\s+/g, '_')
		.replace(/[^\w.\-()]/g, '_');
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
