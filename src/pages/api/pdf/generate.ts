import type { APIRoute } from 'astro';
import { generatePdf } from '@integrations/carbone';
import { createSupabaseServerClient } from '@infrastructure/supabase';
import { SECURITY_HEADERS } from '@infrastructure/security/headers';
import {
	checkRateLimit,
	rateLimitResponse,
} from '@infrastructure/security/rate-limit';
import { createLogger } from '@infrastructure/logging';

const log = createLogger('pdf.generate');

type GenerateBody = {
	data?: unknown;
	templatePath?: string;
	reportName?: string;
	filename?: string;
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

	// Generar un PDF levanta Chromium/Carbone: límite estricto por usuario
	// para que un loop de requests no agote CPU/memoria del contenedor.
	if (!checkRateLimit(`pdf:${user.id}`, 5, 60_000)) {
		return rateLimitResponse(SECURITY_HEADERS);
	}

	try {
		// 1. Leer JSON del body
		const rawBody = await request.json().catch(() => ({}));
		const body = (rawBody || {}) as GenerateBody;

		const { data, templatePath, reportName, filename } = body;

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

		const resolvedFilename = filename ?? reportName ?? 'report';

		const pdfBuffer = await generatePdf({
			reportName: resolvedFilename,
			templatePath,
			data: (data ?? {}) as Record<string, unknown>,
		});

		return new Response(pdfBuffer as BodyInit, {
			status: 200,
			headers: {
				'Content-Type': 'application/pdf',
				'Content-Disposition': `attachment; filename="${resolvedFilename}.pdf"`,
			},
		});
	} catch (error: unknown) {
		const message =
			error instanceof Error ? error.message : 'Error interno generando el PDF';

		// MUY ÚTIL: log en el server (lo ves en Coolify → logs de la app)
		log.error('Error generando PDF', { error });

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
