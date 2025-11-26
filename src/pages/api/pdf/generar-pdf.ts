// src/pages/api/generar.ts
import type { APIRoute } from 'astro';
import { generatePdf } from '../../../lib/carbone';

export const POST: APIRoute = async ({ request }) => {
  try {
    // 1. Obtener datos del Frontend
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const rawBody = await request.json().catch(() => ({}));
    const body = (rawBody || {}) as Record<string, unknown>; // Datos en blanco si el objeto llega vacío

    // Datos de ejemplo + datos que vengan del body
    const reportData = {
      fecha: new Date().toLocaleDateString('es-ES'),
      nombre: 'test',
      ...body
    };

    // 2. Llamar a nuestro servicio externo
    const pdfBuffer = await generatePdf({
      templateName: 'test.docx', // Asegúrate de que este archivo esté en /public/templates/
      data: reportData
    });

    // 3. Devolver el PDF al navegador
    return new Response(pdfBuffer as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        // 'attachment' fuerza la descarga, 'inline' lo abre en el navegador
        'Content-Disposition': 'attachment; filename="reporte-generado.pdf"'
      }
    });

  } catch (error: unknown) {
    // Verificamos si es un objeto Error real para sacar el mensaje de forma segura
    const message = error instanceof Error ? error.message : 'Error interno generando el PDF';
    return new Response(JSON.stringify({
      error: message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};