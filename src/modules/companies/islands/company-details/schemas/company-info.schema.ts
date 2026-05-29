import { z } from 'zod';

const emptyToNull = (value: unknown) => {
	if (typeof value !== 'string') return value;
	const trimmed = value.trim();
	return trimmed === '' ? null : trimmed;
};

export const managementTypeSchema = z.enum([
	'member-managed',
	'manager-managed',
]);

export const entityTypeSchema = z.enum(['llc']);

export const taxClassificationSchema = z
	.enum(['disregarded_entity', 'corporation'])
	.nullable();

const numberFromUnknown = (value: unknown) => {
	if (typeof value === 'number' && Number.isFinite(value)) return value;
	if (typeof value !== 'string') return value;
	const trimmed = value.trim();
	if (trimmed === '') return null;
	const parsed = Number(trimmed);
	return Number.isFinite(parsed) ? parsed : value;
};

const nullableNumberSchema = z.preprocess(numberFromUnknown, z.number().int().nullable());

export const companyInfoSchema = z.object({
	legal_name: z.preprocess(emptyToNull, z.string().nullable()),
	filing_number: z.preprocess(emptyToNull, z.string().nullable()),
	identification_number: z.preprocess(emptyToNull, z.string().nullable()),
	entity_type: entityTypeSchema,
	// formation_country_id se infiere en el backend (siempre US para LLC).
	formation_state_id: nullableNumberSchema,
	management_type: managementTypeSchema,
	tax_clasification: z.preprocess(emptyToNull, taxClassificationSchema),
	activity_code_id: nullableNumberSchema,
	us_source_income: z.boolean().nullable(),
	activity_description: z.preprocess(emptyToNull, z.string().nullable()),
});

export type CompanyInfoFormValues = z.input<typeof companyInfoSchema>;
export type CompanyInfoFormOutput = z.output<typeof companyInfoSchema>;
