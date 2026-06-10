import {
	PDFDocument,
	PDFTextField,
	PDFCheckBox,
	PDFRadioGroup,
	PDFDropdown,
	PDFOptionList,
	StandardFonts,
} from 'pdf-lib';
import type { SyntheticFieldDef, TemplateFieldDefinition } from './types';
import { createLogger } from '@infrastructure/logging';

const log = createLogger('domains.fill-pdf');

export interface FillPdfOptions {
	flatten?: boolean;
	syntheticFields?: SyntheticFieldDef[];
}

export interface FillPdfResult {
	pdf: Uint8Array;
	warnings: string[];
}

export async function fillPdfAcroForm(
	pdfBuffer: ArrayBuffer | Uint8Array,
	fieldValues: Record<string, string | boolean | string[]>,
	options?: FillPdfOptions,
): Promise<FillPdfResult> {
	const pdfDoc = await PDFDocument.load(
		pdfBuffer instanceof ArrayBuffer ? new Uint8Array(pdfBuffer) : pdfBuffer,
	);
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
				} else {
					field.uncheck();
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

	try {
		addSyntheticFields(pdfDoc, options?.syntheticFields ?? []);
	} catch (err) {
		const detail = err instanceof Error ? err.message : 'unknown error';
		log.error('addSyntheticFields failed', { detail });
		throw new Error(`addSyntheticFields failed: ${detail}`);
	}

	if (options?.flatten === true) {
		form.flatten();
	}

	let saved: Uint8Array;
	try {
		saved = await pdfDoc.save();
	} catch (err) {
		const detail = err instanceof Error ? err.message : 'unknown error';
		log.error('pdfDoc.save failed', { detail });
		throw new Error(`pdfDoc.save failed: ${detail}`);
	}

	return { pdf: saved, warnings };
}

export function addSyntheticFields(
	pdfDoc: PDFDocument,
	fields: SyntheticFieldDef[],
): void {
	const form = pdfDoc.getForm();
	const pages = pdfDoc.getPages();
	const font = pdfDoc.embedStandardFont(StandardFonts.Helvetica);
	for (const sf of fields) {
		const pageIdx = sf.pageIndex ?? 0;
		const page = pages[pageIdx];
		if (!page) continue;
		const field = form.createTextField(sf.name);
		field.acroField.setDefaultAppearance('/Helv 6 Tf 0 g');
		field.setText(sf.value);
		field.setFontSize(sf.fontSize ?? 6);
		field.addToPage(page, {
			x: sf.x,
			y: sf.y,
			width: sf.width ?? 110,
			height: sf.height ?? 14,
			font,
		});
	}
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
