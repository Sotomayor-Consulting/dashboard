// src/pages/api/generar.ts
import type { APIRoute } from 'astro';
import { generatePdf } from '@lib/carbone';
import { createSupabaseServerClient } from '@lib/supabase';
import { SECURITY_HEADERS } from '@lib/security/headers';

type GenerateBody = {
	data?: unknown;
	templatePath?: string;
	reportName?: string;
};

export const POST: APIRoute = async ({ request, cookies }) => {
	const supabase = createSupabaseServerClient({ headers: request.headers, cookies });
	const { data: { user }, error: authError } = await supabase.auth.getUser();
	if (authError || !user) {
		return new Response(JSON.stringify({ error: 'Unauthorized' }), {
			status: 401,
			headers: SECURITY_HEADERS,
		});
	}
	try {
		// 1. Leer JSON del body
		const rawBody = await request.json().catch(() => ({}));
		const body = (rawBody || {}) as GenerateBody;

		const { data, templatePath, reportName } = body;

		// Validación básica
		if (!templatePath) {
			return new Response(
				JSON.stringify({ error: 'templatePath es obligatorio' }),
				{
					status: 400,
					headers: SECURITY_HEADERS,
				},
			);
		}

		// 2. Llamar a tu servicio externo
		const pdfBuffer = await generatePdf({
			reportName: reportName ?? 'report',
			templatePath,
			data: (data ?? {}) as Record<string, unknown>,
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
				headers: SECURITY_HEADERS,
			},
		);
	}
};
