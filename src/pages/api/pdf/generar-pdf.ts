// src/pages/api/generar.ts
import type { APIRoute } from 'astro';
import { generatePdf } from '../../../lib/carbone'; // <-- ojo a la ruta

type GenerateBody = {
  data?: unknown;
  templateName?: string;
  reportName?: string;
};

export const POST: APIRoute = async ({ request }) => {
  try {
    // 1. Leer JSON del body
    const rawBody = await request.json().catch(() => ({}));
    const body = (rawBody || {}) as GenerateBody;

    const { data, templateName, reportName } = body;

    // Validación básica
    if (!templateName) {
      return new Response(
        JSON.stringify({ error: 'templateName es obligatorio' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // 2. Llamar a tu servicio externo
    const pdfBuffer = await generatePdf({
      reportName: reportName ?? 'report',
      templateName,
      data: data ?? {},
    });

    // 3. Devolver el PDF
    return new Response(pdfBuffer as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${reportName ?? 'report'}.pdf"`,
      },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Error interno generando el PDF';

    // MUY ÚTIL: log en el server (lo ves en Coolify → logs de la app)
    console.error('Error en /api/generar:', error);

    return new Response(
      JSON.stringify({
        error: message,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
