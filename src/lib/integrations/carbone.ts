import fs from 'node:fs';
import path from 'node:path';

const RENDER_SERVER_URL =
	process.env.RENDER_SERVER_URL ?? import.meta.env.RENDER_SERVER_URL;
const API_KEY =
	process.env.API_KEY_PDF_GENERATOR ??
	import.meta.env.API_KEY_PDF_GENERATOR;

interface LegacyPdfOptions {
	reportName: string;
	templatePath: string;
	data: Record<string, unknown>;
}

interface RenderFromUrlInput {
	templateUrl: string;
	data: Record<string, unknown>;
	options?: Record<string, unknown>;
	filename?: string;
	format?: 'pdf' | 'docx' | 'xlsx';
}

async function callMicroservice(payload: Record<string, unknown>): Promise<Buffer> {
	if (!API_KEY) throw new Error('Falta configurar API_KEY');
	if (!RENDER_SERVER_URL) throw new Error('Falta configurar RENDER_SERVER_URL');

	const response = await fetch(`${RENDER_SERVER_URL}/render`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'x-api-key': API_KEY,
		},
		body: JSON.stringify(payload),
	});

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(`Error del Microservicio (${response.status}): ${errorText}`);
	}

	return Buffer.from(await response.arrayBuffer());
}

export async function renderFromUrl(input: RenderFromUrlInput): Promise<Buffer> {
	return callMicroservice({
		templatePath: input.templateUrl,
		data: input.data,
		options: input.options ?? {},
		filename: input.filename,
		format: input.format ?? 'pdf',
	});
}

export const generatePdf = async ({
	templatePath,
	data,
	reportName,
}: LegacyPdfOptions): Promise<Buffer> => {
	const resolvedTemplatePath = path.resolve(
		process.cwd(),
		'src/domains/documents/templates',
		templatePath,
	);

	if (!fs.existsSync(resolvedTemplatePath)) {
		throw new Error(`La plantilla no existe en: ${resolvedTemplatePath}`);
	}

	const templateBuffer = fs.readFileSync(resolvedTemplatePath);
	const templateBase64 = templateBuffer.toString('base64');

	return callMicroservice({
		templateBase64,
		data,
		filename: reportName,
		format: 'pdf',
	});
};
