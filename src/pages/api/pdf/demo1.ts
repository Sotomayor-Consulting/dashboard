// src/pages/api/pdf/envio.ts
export const prerender = false;

import type { APIRoute } from 'astro';
import fs from 'node:fs/promises';
import fssync from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';

// Usa el mismo cliente Supabase que en tu endpoint insert.ts
import { supabase } from '../../../lib/supabase';

const require = createRequire(import.meta.url);
// @ts-ignore - carbone no trae tipos
const carbone = require('carbone');

// ============ Helpers ============

function debugStep(step: string, extra?: any) {
	const ts = new Date().toISOString();
	if (extra !== undefined) {
		console.log(`[CARBONE][${ts}] ${step}`, extra);
	} else {
		console.log(`[CARBONE][${ts}] ${step}`);
	}
}

async function ensureDir(p: string) {
	await fs.mkdir(p, { recursive: true });
}

function findLibreOffice(): string {
	const possiblePaths = [
		'C:\\Program Files\\LibreOffice\\program\\soffice.com',
	];

	for (const officePath of possiblePaths) {
		if (fssync.existsSync(officePath)) {
			return officePath;
		}
	}

	throw new Error('LibreOffice no encontrado en las rutas conocidas');
}

// ============ Carbone config ============

carbone.set({
	templatePath: path.join(process.cwd(), 'src', 'templates'),
	tempPath: path.join(process.cwd(), '.carbone-tmp'),
	lang: 'es-es',
	factories: 1,
	startFactory: false,
});

function renderCarboneToDocx(
	templateName: string,
	data: any,
	options: any = {},
): Promise<Buffer> {
	return new Promise((resolve, reject) => {
		debugStep('5. Llamando a carbone.render (DOCX sin convertTo)', {
			templateName,
			options,
		});

		carbone.render(templateName, data, options, (err: any, res: Buffer) => {
			if (err) {
				debugStep('5.E Error en carbone.render', err);
				return reject(err);
			}
			debugStep('5.OK DOCX generado por Carbone', { size: res?.length });
			resolve(res);
		});
	});
}

// ============ ENDPOINT ============

export const GET: APIRoute = async ({ request, cookies }) => {
	let tempDocxPath: string | null = null;
	let tempPdfPath: string | null = null;

	debugStep('1. Entrando al endpoint GET /api/pdf/envio');

	try {
		// 1) Leer submission_id desde la URL:
		//    /api/pdf/envio?submission_id=XXXX
		const url = new URL(request.url);
		const submissionId = url.searchParams.get('submission_id');

		if (!submissionId) {
			return new Response('Falta el parámetro ?submission_id=', {
				status: 400,
				headers: { 'Content-Type': 'text/plain' },
			});
		}
		debugStep('1.1 submission_id recibido', submissionId);

		// 2) (Opcional) Sesión Supabase desde cookies, por si RLS lo requiere
		const at = cookies.get('sb-access-token');
		const rt = cookies.get('sb-refresh-token');
		if (at && rt) {
			await supabase.auth.setSession({
				access_token: at.value,
				refresh_token: rt.value,
			});
			debugStep('1.2 Sesión Supabase establecida desde cookies');
		} else {
			debugStep('1.2 Sin cookies sb-access-token / sb-refresh-token');
		}

		// 3) Traer data_json desde formularios_envios usando submission_id
		const { data: fila, error } = await supabase
			.from('formularios_envios')
			.select('data_json')
			.eq('submission_id', submissionId) // 👈 columna de tu tabla
			.single();

		if (error) {
			debugStep('2.E Error consultando formularios_envios', error);
			return new Response('Error consultando formularios_envios', {
				status: 500,
				headers: { 'Content-Type': 'text/plain' },
			});
		}

		if (!fila || !fila.data_json) {
			debugStep('2.E No se encontró data_json para ese submission_id');
			return new Response('No se encontró data_json para ese submission_id', {
				status: 404,
				headers: { 'Content-Type': 'text/plain' },
			});
		}

		const data = fila.data_json; // 👈 esto va directo a Carbone
		debugStep('2.OK data_json obtenido (keys)', Object.keys(data));

		const cwd = process.cwd();
		debugStep('3. process.cwd()', cwd);

		const templateName = 'test-2.docx';
		const absoluteTemplate = path.join(cwd, 'src', 'templates', templateName);
		debugStep('3.1 Ruta absoluta del template', absoluteTemplate);

		if (!fssync.existsSync(absoluteTemplate)) {
			debugStep('3.E Template NO existe');
			return new Response('No se encontró src/templates/test-2.docx', {
				status: 500,
				headers: { 'Content-Type': 'text/plain' },
			});
		}

		const docxBuffer = await renderCarboneToDocx(templateName, data);

		if (!docxBuffer || docxBuffer.length === 0) {
			return new Response('Error: DOCX generado está vacío', {
				status: 500,
				headers: { 'Content-Type': 'text/plain' },
			});
		}

		// 6) Directorio temporal
		const tempDir = path.join(cwd, '.carbone-tmp');
		await ensureDir(tempDir);
		debugStep('6. Directorio temporal listo', tempDir);

		const timestamp = Date.now();
		tempDocxPath = path.join(tempDir, `temp-${timestamp}.docx`);
		tempPdfPath = path.join(tempDir, `temp-${timestamp}.pdf`);

		// 7) Guardar DOCX temporal
		await fs.writeFile(tempDocxPath, docxBuffer);
		debugStep('7. DOCX temporal guardado', tempDocxPath);

		// 8) LibreOffice
		const libreOfficePath = findLibreOffice();
		debugStep('8. LibreOffice encontrado en', libreOfficePath);

		const cmd = `"${libreOfficePath}" --headless --nologo --norestore --convert-to pdf --outdir "${tempDir}" "${tempDocxPath}"`;

		execSync(cmd, {
			stdio: 'pipe',
			timeout: 30000,
		});
		debugStep('9.OK Conversión a PDF finalizada');

		// 9) Leer PDF
		const pdfBuffer = await fs.readFile(tempPdfPath);
		debugStep('10. PDF leído, tamaño', { size: pdfBuffer.length });

		const filename = `envio-${submissionId}.pdf`;

		return new Response(pdfBuffer as any, {
			status: 200,
			headers: {
				'Content-Type': 'application/pdf',
				'Content-Disposition': `attachment; filename="${filename}"`,
			},
		});
	} catch (error: any) {
		debugStep('E. Error general en endpoint', error);

		let errorMessage = 'Error interno del servidor';
		if (error.message?.includes('LibreOffice no encontrado')) {
			errorMessage =
				'LibreOffice no está instalado o no se encontró en las rutas conocidas';
		} else if (error.message?.includes('timeout')) {
			errorMessage = 'La conversión con LibreOffice tardó demasiado tiempo';
		}

		return new Response(`Error: ${errorMessage}`, {
			status: 500,
			headers: { 'Content-Type': 'text/plain' },
		});
	} finally {
		// Limpieza de archivos temporales
		if (tempDocxPath) {
			try {
				await fs.unlink(tempDocxPath);
			} catch (e) {
				debugStep('W. No se pudo eliminar DOCX temporal', e);
			}
		}
		if (tempPdfPath) {
			try {
				await fs.unlink(tempPdfPath);
			} catch (e) {
				debugStep('W. No se pudo eliminar PDF temporal', e);
			}
		}
	}
};
