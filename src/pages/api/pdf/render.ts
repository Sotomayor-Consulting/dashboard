import type { APIRoute } from 'astro';
import puppeteer from 'puppeteer';

export const POST: APIRoute = async ({ request }) => {
  try {
    const formData = await request.formData();
    const pdfFile = formData.get('pdf') as File;
    const pageNum = parseInt(formData.get('page') as string) || 1;

    if (!pdfFile) {
      return new Response(JSON.stringify({ error: 'No PDF file provided' }), {
        status: 400,
      });
    }

    const pdfBuffer = Buffer.from(await pdfFile.arrayBuffer());
    
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 800, height: 1100 });
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              display: flex; 
              justify-content: center; 
              background: #f0f0f0;
              min-height: 100vh;
              padding: 20px;
            }
            .pdf-container {
              background: white;
              box-shadow: 0 2px 10px rgba(0,0,0,0.3);
              max-width: 100%;
            }
            embed { display: block; }
          </style>
        </head>
        <body>
          <div class="pdf-container">
            <embed src="data:application/pdf;base64,${pdfBuffer.toString('base64')}" 
                   type="application/pdf" 
                   width="612" 
                   height="792" />
          </div>
        </body>
      </html>
    `;
    
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 1000));
    
    const container = await page.$('.pdf-container');
    const imageBuffer = container 
      ? await container.screenshot({ encoding: 'base64', type: 'png' })
      : null;

    await browser.close();

    if (!imageBuffer) {
      return new Response(
        JSON.stringify({ error: 'Failed to render PDF' }),
        { status: 500 }
      );
    }

    return new Response(
      JSON.stringify({
        image: imageBuffer,
        width: 612,
        height: 792,
        totalPages: 1,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error rendering PDF:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500 }
    );
  }
};
