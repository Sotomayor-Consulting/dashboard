import BASE_TEMPLATE_HTML from './templates/base-email.html?raw';

type TemplateVariables = Record<string, string>;

function escapeHtml(value: string): string {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#39;');
}

function formatHtmlValue(key: string, value: string): string {
	const escaped = escapeHtml(value);
	if (key === 'cta_url') return escaped;
	return escaped.replace(/\r?\n/g, '<br />');
}

export function renderBusinessEmailHtml(variables: TemplateVariables): string {
	let html = BASE_TEMPLATE_HTML;

	for (const [key, rawValue] of Object.entries(variables)) {
		const placeholder = `{{${key}}}`;
		html = html.replaceAll(placeholder, formatHtmlValue(key, rawValue));
	}

	return html;
}
