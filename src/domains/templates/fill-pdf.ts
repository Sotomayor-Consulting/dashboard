import {
	PDFDocument,
	PDFTextField,
	PDFCheckBox,
	PDFRadioGroup,
	PDFDropdown,
	PDFOptionList,
} from 'pdf-lib';
import type { TemplateFieldDefinition } from './types';

export interface FillPdfResult {
	pdf: Uint8Array;
	warnings: string[];
}

export async function fillPdfAcroForm(
	pdfBuffer: ArrayBuffer | Uint8Array,
	fieldValues: Record<string, string | boolean | string[]>,
	options?: { flatten?: boolean },
): Promise<FillPdfResult> {
	const pdfDoc = await PDFDocument.load(pdfBuffer);
	const form = pdfDoc.getForm();
	const fields = form.getFields();
	const warnings: string[] = [];

	const pdfFieldNames = new Set(fields.map((f) => f.getName()));
	for (const mappedName of Object.keys(fieldValues)) {
		if (!pdfFieldNames.has(mappedName)) {
			warnings.push(`Field "${mappedName}" not found in PDF`);
		}
	}

	for (const field of fields) {
		const fieldName = field.getName();
		const value = fieldValues[fieldName];

		if (value === undefined) continue;

		try {
			if (field instanceof PDFTextField) {
				field.setText(String(value));
			} else if (field instanceof PDFCheckBox) {
				if (value === true || String(value).toLowerCase() === 'true') {
					field.check();
				}
			} else if (field instanceof PDFRadioGroup) {
				field.select(String(value));
			} else if (field instanceof PDFDropdown) {
				field.select(String(value));
			} else if (field instanceof PDFOptionList) {
				field.select(Array.isArray(value) ? value.map(String) : [String(value)]);
			}
		} catch (err) {
			const detail = err instanceof Error ? err.message : 'unknown error';
			warnings.push(`Field "${fieldName}" rejected the value: ${detail}`);
		}
	}

	if (options?.flatten !== false) {
		form.flatten();
	}

	return { pdf: await pdfDoc.save(), warnings };
}

export async function detectPdfFormFields(
	pdfBuffer: ArrayBuffer | Uint8Array,
): Promise<TemplateFieldDefinition[]> {
	const pdfDoc = await PDFDocument.load(pdfBuffer);
	const form = pdfDoc.getForm();
	const fields = form.getFields();

	const definitions: TemplateFieldDefinition[] = [];

	for (const field of fields) {
		const name = field.getName();
		let widget: TemplateFieldDefinition['widget'] = 'input';
		let type: TemplateFieldDefinition['type'] = 'text';
		let options: string[] | null = null;

		if (field instanceof PDFTextField) {
			widget = 'input';
			type = 'text';
		} else if (field instanceof PDFCheckBox) {
			widget = 'checkbox';
			type = 'boolean';
		} else if (field instanceof PDFRadioGroup) {
			widget = 'radio';
			type = 'choice';
			options = field.getOptions() ?? null;
		} else if (field instanceof PDFDropdown) {
			widget = 'select';
			type = 'choice';
			options = field.getOptions() ?? null;
		} else if (field instanceof PDFOptionList) {
			widget = 'list';
			type = 'multi_choice';
			options = field.getOptions() ?? null;
		}

		definitions.push({
			name,
			type,
			label: name.replace(/[_-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
			required: false,
			default_value: null,
			widget,
			options,
		});
	}

	return definitions;
}
