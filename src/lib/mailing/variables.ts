// src/lib/template.ts
export function applyTemplate(
	template: string,
	vars: Record<string, string>,
): string {
	let output = template;

	for (const [key, value] of Object.entries(vars)) {
		const re = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
		output = output.replace(re, value ?? '');
	}

	// Opcional: elimina placeholders no usados
	output = output.replace(/{{\s*[\w.]+\s*}}/g, '');
	return output;
}
