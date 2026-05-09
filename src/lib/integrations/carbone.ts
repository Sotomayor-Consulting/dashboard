// src/lib/pdfService.ts
import fs from 'node:fs';
import path from 'node:path';

// Obtenemos la URL del entorno
const RENDER_SERVER_URL =
	process.env.RENDER_SERVER_URL ?? import.meta.env.RENDER_SERVER_URL;
const API_KEY_PDF_GENERATOR =
	process.env.API_KEY_PDF_GENERATOR ??
	import.meta.env.API_KEY_PDF_GENERATOR;

interface PdfOptions {
	reportName: string;
	templatePath: string;
	data: Record<string, unknown>;
}

export const generatePdf = async ({
	templatePath,
	data,
	reportName,
}: PdfOptions): Promise<Buffer> => {
	if (!API_KEY_PDF_GENERATOR) {
		throw new Error('Falta configurar API_KEY_PDF_GENERATOR');
	}

	if (!RENDER_SERVER_URL) {
		throw new Error('Falta configurar RENDER_SERVER_URL');
	}

	// leer plantilla
	const resolvedTemplatePath = path.resolve(
		process.cwd(),
		'src/domains/documents/templates',
		templatePath,
	);

	// verificar que la plantilla exista
	if (!fs.existsSync(resolvedTemplatePath)) {
		throw new Error(`La plantilla no existe en: ${resolvedTemplatePath}`);
	}

	// convertir la plantilla a Base64
	const templateBuffer = fs.readFileSync(resolvedTemplatePath);
	const templateBase64 = templateBuffer.toString('base64');

	// enviar al Microservicio
	try {
		const response = await fetch(`${RENDER_SERVER_URL}/render`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'x-api-key': API_KEY_PDF_GENERATOR,
			},
			body: JSON.stringify({
				templateBase64,
				data,
				reportName,
			}),
		});

		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(
				`Error del Microservicio (${response.status}): ${errorText}`,
			);
		}

		// 4. Recibir el PDF binario y convertirlo a Buffer
		const arrayBuffer = await response.arrayBuffer();
		return Buffer.from(arrayBuffer);
	} catch (error: unknown) {
		// Verificamos si es un objeto Error real (lo más común)
		if (error instanceof Error) {
			throw new Error(error.message);
		}
		// Si resulta ser un string
		else if (typeof error === 'string') {
			throw new Error(error);
		}
		// Si es otra cosa rara
		else {
			throw new Error('Error desconocido');
		}
	}
};
