import type { APIRoute } from "astro";
import fs from "node:fs/promises";
import fssync from "node:fs";
import path from "node:path";
import Mustache from "mustache";
import puppeteer, { Browser } from "puppeteer";

let browserPromise: Promise<Browser> | null = null;
async function getBrowser() {
  if (!browserPromise) {
    browserPromise = puppeteer.launch({
      headless: 'new', // o true
      args: ["--no-sandbox", "--disable-setuid-sandbox"], // útiles en contenedores
    });
  }
  return browserPromise;
}

async function readTemplate(defaultPath: string, uploaded?: File) {
  if (uploaded instanceof File) {
    const buf = Buffer.from(await uploaded.arrayBuffer());
    return buf.toString("utf-8");
  }
  if (fssync.existsSync(defaultPath)) {
    return await fs.readFile(defaultPath, "utf-8");
  }
  // Plantilla mínima embebida por si no hay archivo
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8"/>
<title>Factura {{id}}</title>
<style>
  @page { size: A4; margin: 20mm; }
  body { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; color: #222; }
  h1 { margin: 0 0 8px; }
  .muted { color: #666; }
  table { border-collapse: collapse; width: 100%; margin-top: 12px; }
  th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; }
  th { background: #f3f4f6; }
  .right { text-align: right; }
  .total { font-weight: 700; }
</style>
</head>
<body>
  <h1>Factura #{{id}}</h1>
  <div class="muted">Fecha: {{dateStr}}</div>

  <h3>Empresa</h3>
  <div>{{company.name}} — {{company.address}}, {{company.postalCode}} {{company.city}}</div>

  <h3>Cliente</h3>
  <div>{{customer.name}} — {{customer.address}}, {{customer.postalCode}} {{customer.city}}</div>

  <table>
    <thead>
      <tr><th>Producto</th><th class="right">Cantidad</th><th class="right">Precio</th><th class="right">Total</th></tr>
    </thead>
    <tbody>
      {{#products}}
      <tr>
        <td>{{name}}</td>
        <td class="right">{{quantityStr}}</td>
        <td class="right">{{priceUnitStr}}</td>
        <td class="right">{{priceTotalStr}}</td>
      </tr>
      {{/products}}
    </tbody>
    <tfoot>
      <tr>
        <td colspan="3" class="right total">Total</td>
        <td class="right total">{{totalStr}}</td>
      </tr>
    </tfoot>
  </table>
</body>
</html>`;
}

function fmtMoney(n: number, currency = "USD", locale = "es-EC") {
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(Number(n ?? 0));
}
function fmtInt(n: number, locale = "es-EC") {
  return new Intl.NumberFormat(locale).format(Number(n ?? 0));
}
function fmtDateISO(iso?: string) {
  const d = new Date(iso ?? "");
  return isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
}

export const POST: APIRoute = async ({ request }) => {
  try {
    // Espera multipart/form-data:
    // - template (opcional) => archivo .html
    // - data (opcional) => JSON string
    const form = await request.formData();
    const templateFile = form.get("template");
    const dataText = form.get("data")?.toString();

    const defaultTpl = path.join(process.cwd(), "templates", "invoice.html");
    const template = await readTemplate(defaultTpl, templateFile as File | undefined);

    const rawData = dataText ? JSON.parse(dataText) : {
      id: 4242,
      date: "2024-05-19T16:27:21Z",
      company: { name: "Sotomayor Consulting", address: "Calle Falsa 123", postalCode: "12345", city: "Quito" },
      customer: { name: "Michael J. Fox", address: "6834 Hollywood Blvd", postalCode: "90028", city: "Los Angeles" },
      products: [
        { name: "Hoverboard", priceUnit: 199.15, quantity: 10, priceTotal: 1991.5 },
        { name: "DeLorean DMC-12", priceUnit: 24900, quantity: 1, priceTotal: 24900 }
      ],
    };

    // Pre-formateo (para que el HTML sea “sin código”)
    const total = (rawData.products ?? []).reduce((a: number, it: any) => a + Number(it.priceTotal ?? 0), 0);
    const prepared = {
      ...rawData,
      dateStr: fmtDateISO(rawData.date),
      products: (rawData.products ?? []).map((p: any) => ({
        ...p,
        quantityStr: fmtInt(p.quantity),
        priceUnitStr: fmtMoney(p.priceUnit),
        priceTotalStr: fmtMoney(p.priceTotal),
      })),
      totalStr: fmtMoney(total),
    };

    const html = Mustache.render(template, prepared);

    const browser = await getBrowser();            // se reutiliza entre requests
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "12mm", right: "12mm", bottom: "16mm", left: "12mm" },
    });
    await page.close();

    return new Response(pdf, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="documento.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err: any) {
    return new Response(`[puppeteer] Error: ${err?.message ?? err}`, {
      status: 500,
      headers: { "Content-Type": "text/plain" },
    });
  }
};

// (Opcional) GET para probar rápido sin subir nada
export const GET: APIRoute = async (ctx) => {
  const form = new FormData();
  return POST({ ...ctx, request: new Request(ctx.url, { method: "POST", body: form }) });
};
