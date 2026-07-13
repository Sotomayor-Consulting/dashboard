// ─── Sanitización de HTML de notificaciones/correos ─────────────────────
//
// SOLO SERVIDOR: `sanitize-html` depende de APIs de Node (htmlparser2). NO
// importar desde `.client.ts`, islands `.tsx` ni scripts inline `.astro`.
//
// Allowlist estricta acorde al editor básico (texto, tamaño, enlaces). Se
// aplica al escribir (canal in-app y correo) para que el HTML almacenado y
// renderizado in-app sea seguro frente a XSS almacenado.

import sanitizeHtml from 'sanitize-html';

const FONT_SIZE = /^\d+(?:\.\d+)?(?:px|em|rem|%)$/;

export function sanitizeNotificationHtml(html: string): string {
	return sanitizeHtml(html, {
		allowedTags: ['p', 'br', 'b', 'strong', 'i', 'em', 'u', 'a', 'span'],
		allowedAttributes: {
			a: ['href', 'target', 'rel'],
			span: ['style'],
		},
		allowedStyles: {
			span: {
				'font-size': [FONT_SIZE],
			},
		},
		allowedSchemes: ['http', 'https', 'mailto'],
		transformTags: {
			a: sanitizeHtml.simpleTransform('a', {
				rel: 'noopener noreferrer',
				target: '_blank',
			}),
		},
	});
}
