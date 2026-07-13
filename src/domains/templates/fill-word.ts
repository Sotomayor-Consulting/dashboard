import { renderFromUrl } from '@integrations/carbone';

export interface FillWordOptions {
	filename?: string;
	format?: 'pdf' | 'docx';
}

export interface FillWordResult {
	pdf: Uint8Array;
	warnings: string[];
}

export async function fillWordCarbone(
	templateUrl: string,
	data: Record<string, unknown>,
	options?: FillWordOptions,
): Promise<FillWordResult> {
	const warnings: string[] = [];

	const buffer = await renderFromUrl({
		templateUrl,
		data,
		options: { convertTo: options?.format ?? 'pdf' },
		...(options?.filename && { filename: options.filename }),
		format: options?.format ?? 'pdf',
	});

	return { pdf: new Uint8Array(buffer), warnings };
}
