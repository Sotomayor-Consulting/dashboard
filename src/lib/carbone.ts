// src/lib/pdfService.ts
import fs from 'node:fs';
import path from 'node:path';

// Obtenemos la URL del entorno
const {RENDER_SERVER_URL} = import.meta.env;

interface PdfOptions {
  templateName: string;
  data: Record<string, unknown>;
}

export const generatePdf = async ({ templateName, data }: PdfOptions): Promise<Buffer> => {
  // leer plantilla
  const templatePath = path.resolve(process.cwd(), 'src/templates', templateName);
  
  // verificar que la plantilla exista
  if (!fs.existsSync(templatePath)) {
    throw new Error(`La plantilla no existe en: ${templatePath}`);
  }

  // convertir la plantilla a Base64
  const templateBuffer = fs.readFileSync(templatePath);
  const templateBase64 = templateBuffer.toString('base64');

  // enviar al Microservicio
  try {
    const response = await fetch(`${RENDER_SERVER_URL}/render`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        templateBase64,
        data
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error del Microservicio (${response.status}): ${errorText}`);
    }

    // 4. Recibir el PDF binario y convertirlo a Buffer
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);

  } catch (error) {
    console.error('Fallo en la conexión con el servicio PDF:', error);
    throw error;
  }
};