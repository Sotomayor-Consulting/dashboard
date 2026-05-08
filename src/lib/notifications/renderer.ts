import type { NotificationContext } from './types';

const TOKEN_REGEX = /{{\s*([a-zA-Z0-9_\.]+)\s*}}/g;

function toSafeString(value: unknown): string {
	if (value === null || value === undefined) return '';
	if (typeof value === 'string') return value;
	if (typeof value === 'number' || typeof value === 'boolean') {
		return String(value);
	}
	return '';
}

export function renderTemplate(
	template: string,
	context: NotificationContext,
): string {
	return template.replace(TOKEN_REGEX, (_, token: string) => {
		return toSafeString(context[token]);
	});
}

export function extractTemplateTokens(template: string): string[] {
	const tokens = new Set<string>();
	let match: RegExpExecArray | null;

	while ((match = TOKEN_REGEX.exec(template)) !== null) {
		const token = match[1];
		if (token) tokens.add(token);
	}

	TOKEN_REGEX.lastIndex = 0;

	return [...tokens];
}

export function findMissingContextKeys(
	templates: string[],
	context: NotificationContext,
	explicitRequired: string[] = [],
): string[] {
	const required = new Set<string>(explicitRequired);

	for (const tpl of templates) {
		for (const token of extractTemplateTokens(tpl)) {
			required.add(token);
		}
	}

	return [...required].filter((key) => {
		const value = context[key];
		return value === null || value === undefined || value === '';
	});
}
