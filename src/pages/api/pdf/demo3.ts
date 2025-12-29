import type { APIRoute } from 'astro';
import fs from 'node:fs/promises';
import fssync from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const carbone = require('carbone');

async function ensureDir(p: string) {
	await fs.mkdir(p, { recursive: true });
}

function findLibreOffice(): string {
	const possiblePaths = [
		'C:\\Program Files\\LibreOffice\\program\\soffice.exe',
	];

	for (const officePath of possiblePaths) {
		if (fssync.existsSync(officePath)) {
			return officePath;
		}
	}

	throw new Error('LibreOffice no encontrado');
}

export const GET: APIRoute = async () => {
	let tempDocxPath: string | null = null;
	let tempPdfPath: string | null = null;

	try {
		// 1) Buscar plantilla
		const candidates = [
			path.join(process.cwd(), 'templates', 'test-2.docx'),
			path.join(process.cwd(), 'src', 'templates', 'test-2.docx'),
		];

		let tplPath: string | null = null;
		for (const p of candidates) {
			if (fssync.existsSync(p)) {
				tplPath = p;
				break;
			}
		}

		if (!tplPath) {
			return new Response('No se encontró test-2.docx', {
				status: 500,
				headers: { 'Content-Type': 'text/plain' },
			});
		}

		// 2) Directorio temporal
		const tempDir = path.join(process.cwd(), '.carbone-tmp');
		await ensureDir(tempDir);
		carbone.set({ tempPath: tempDir });

		// 3) Datos de prueba simples - EVITAR formateadores complejos
		const data = {
			invoiceNumber: 'F-2024-001',
			date: '19/05/2024',
			customer: {
				name: 'Cliente de Prueba',
				address: 'Calle Falsa 123',
				city: 'Madrid',
			},
			products: [
				{
					name: 'Producto A',
					quantity: 2,
					price: 50.0,
				},
				{
					name: 'Producto B',
					quantity: 1,
					price: 30.0,
				},
				{
					name: 'Producto C',
					quantity: 3,
					price: 10.0,
				},
			],
			total: 130.0,
		};

		console.log('Generando DOCX...');

		// 4) Generar DOCX con Carbone - SIN opciones de convertTo
		const docxBuffer: Buffer = await new Promise((resolve, reject) => {
			carbone.render(tplPath, data, {}, (err: any, res: Buffer) => {
				if (err) {
					console.error('Error en carbone.render:', err);
					return reject(err);
				}
				resolve(res);
			});
		});

		if (!docxBuffer?.length) {
			return new Response('Error: DOCX generado está vacío', {
				status: 500,
				headers: { 'Content-Type': 'text/plain' },
			});
		}

		console.log('DOCX generado correctamente, tamaño:', docxBuffer.length);

		// 5) Encontrar LibreOffice
		const libreOfficePath = findLibreOffice();
		console.log('LibreOffice encontrado en:', libreOfficePath);

		// 6) Convertir a PDF
		const timestamp = Date.now();
		tempDocxPath = path.join(tempDir, `temp-${timestamp}.docx`);
		tempPdfPath = path.join(tempDir, `temp-${timestamp}.pdf`);

		console.log('Guardando DOCX temporal...');
		await fs.writeFile(tempDocxPath, docxBuffer);

		console.log('Convirtiendo a PDF con LibreOffice...');

		// Ejecutar conversión con timeout
		execSync(
			`"${libreOfficePath}" --headless --convert-to pdf --outdir "${tempDir}" "${tempDocxPath}"`,
			{
				stdio: 'pipe',
				timeout: 30000, // 30 segundos timeout
			},
		);

		console.log('Leyendo PDF generado...');
		const pdfBuffer = await fs.readFile(tempPdfPath);

		console.log('PDF generado correctamente, tamaño:', pdfBuffer.length);

		return new Response(pdfBuffer as any, {
			status: 200,
			headers: {
				'Content-Type': 'application/pdf',
				'Content-Disposition': 'attachment; filename="documento.pdf"',
			},
		});
	} catch (error: any) {
		console.error('Error general:', error);

		let errorMessage = 'Error interno del servidor';
		if (error.message?.includes('LibreOffice no encontrado')) {
			errorMessage = 'LibreOffice no está instalado o no se encontró';
		} else if (error.message?.includes('timeout')) {
			errorMessage = 'La conversión tardó demasiado tiempo';
		} else if (error.message?.includes('formatter')) {
			errorMessage = 'Error en la plantilla: formateador no reconocido';
		}

		return new Response(`Error: ${errorMessage}`, {
			status: 500,
			headers: { 'Content-Type': 'text/plain' },
		});
	} finally {
		// Limpiar archivos temporales
		try {
			if (tempDocxPath) await fs.unlink(tempDocxPath);
		} catch (e) {
			console.warn('No se pudo eliminar DOCX temporal:', e);
		}

		try {
			if (tempPdfPath) await fs.unlink(tempPdfPath);
		} catch (e) {
			console.warn('No se pudo eliminar PDF temporal:', e);
		}
	}
};
