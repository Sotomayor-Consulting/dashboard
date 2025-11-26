import type { APIRoute } from 'astro';
import { generatePdf } from '../../../lib/carbone';

export const POST: APIRoute = async ({ request }) => {
  const data = await request.json();
  const pdfBuffer = await generatePdf('test.docx', data);

  return new Response(pdfBuffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="documento.pdf"'
    }
  });
};