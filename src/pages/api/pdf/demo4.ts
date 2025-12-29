// src/pages/api/pdf/envio.ts
export const prerender = false;

import type { APIRoute } from 'astro';
import fs from 'node:fs/promises';
import fssync from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';

// Supabase
import { supabase } from '../../../lib/supabase';

// ==== docx-templates vía require (para evitar el error de default) ====
const require = createRequire(import.meta.url);
// @ts-ignore
const createReport = require('docx-templates');

// ============ Helpers ============

function debugStep(step: string, extra?: any) {
	const ts = new Date().toISOString();
	if (extra !== undefined) {
		console.log(`[DOCX-TPL][${ts}] ${step}`, extra);
	} else {
		console.log(`[DOCX-TPL][${ts}] ${step}`);
	}
}

async function ensureDir(p: string) {
	await fs.mkdir(p, { recursive: true });
}

function findLibreOffice(): string {
	const possiblePaths = [
		'C:\\Program Files\\LibreOffice\\program\\soffice.com',
		'C:\\Program Files (x86)\\LibreOffice\\program\\soffice.com',
	];

	for (const officePath of possiblePaths) {
		if (fssync.existsSync(officePath)) {
			return officePath;
		}
	}

	throw new Error('LibreOffice no encontrado en las rutas conocidas');
}

// ============ ENDPOINT ============

export const GET: APIRoute = async ({ request, cookies }) => {
	let tempDocxPath: string | null = null;
	let tempPdfPath: string | null = null;

	debugStep('1. Entrando al endpoint GET /api/pdf/envio');

	try {
		// 1) Leer submission_id desde la URL:
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
			.eq('submission_id', submissionId)
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

		const data = fila.data_json;
		debugStep('2.OK data_json obtenido (keys)', Object.keys(data));

		// 4) Leer template DOCX desde disco
		const cwd = process.cwd();
		debugStep('3. process.cwd()', cwd);

		const templateName = 'input.docx';
		const templatePath = path.join(cwd, 'src', 'templates', templateName);
		debugStep('3.1 Ruta absoluta del template', templatePath);

		if (!fssync.existsSync(templatePath)) {
			debugStep('3.E Template NO existe');
			return new Response('No se encontró src/templates/input.docx', {
				status: 500,
				headers: { 'Content-Type': 'text/plain' },
			});
		}

		const templateBuffer = await fs.readFile(templatePath);
		debugStep('3.2 Template leído', { size: templateBuffer.length });

		// 5) Generar DOCX con docx-templates
		debugStep('4. Generando DOCX con docx-templates');

		const docxBuffer: Buffer = await createReport({
			template: templateBuffer,
			data, // JSON desde Supabase
			cmdDelimiter: ['{{', '}}'], // si usas {{variable}} en vez de sintaxis por defecto
			// noSandbox: true,           // opcional si usas mucha lógica JS en el template
		});

		if (!docxBuffer || docxBuffer.length === 0) {
			return new Response('Error: DOCX generado está vacío', {
				status: 500,
				headers: { 'Content-Type': 'text/plain' },
			});
		}
		debugStep('4.OK DOCX generado', { size: docxBuffer.length });

		// 6) Directorio temporal
		const tempDir = path.join(cwd, '.carbone-tmp'); // puedes renombrar luego
		await ensureDir(tempDir);
		debugStep('5. Directorio temporal listo', tempDir);

		const timestamp = Date.now();
		tempDocxPath = path.join(tempDir, `temp-${timestamp}.docx`);
		tempPdfPath = path.join(tempDir, `temp-${timestamp}.pdf`);

		// 7) Guardar DOCX temporal
		await fs.writeFile(tempDocxPath, docxBuffer);
		debugStep('6. DOCX temporal guardado', tempDocxPath);

		// 8) LibreOffice → PDF
		const libreOfficePath = findLibreOffice();
		debugStep('7. LibreOffice encontrado en', libreOfficePath);

		const cmd = `"${libreOfficePath}" --headless --nologo --norestore --convert-to pdf --outdir "${tempDir}" "${tempDocxPath}"`;
		debugStep('8. Ejecutando comando LibreOffice', cmd);

		execSync(cmd, {
			stdio: 'pipe',
			timeout: 30000,
		});
		debugStep('8.OK Conversión a PDF finalizada');

		// 9) Leer PDF generado
		const pdfBuffer = await fs.readFile(tempPdfPath);
		debugStep('9. PDF leído', { size: pdfBuffer.length });

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
		// 10) Limpieza de archivos temporales
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
