import { z } from 'zod';

const nullableText = z
	.string()
	.trim()
	.transform((value) => (value.length ? value : null))
	.nullable()
	.optional();

const numberFromUnknown = (value: unknown) => {
	if (typeof value === 'number' && Number.isFinite(value)) return value;
	if (typeof value !== 'string') return value;
	const trimmed = value.trim();
	if (trimmed === '') return null;
	const parsed = Number(trimmed);
	return Number.isFinite(parsed) ? parsed : value;
};

const nullableNumber = z.preprocess(
	numberFromUnknown,
	z.number().int().nullable(),
);
const requiredNumber = z.preprocess(
	numberFromUnknown,
	z.number({ message: 'País es requerido' }).int(),
);

export const companyAddressSchema = z.object({
	type: z.string().trim().min(1, 'Tipo es requerido'),
	country_id: requiredNumber,
	state_id: nullableNumber,
	city: z.string().trim().min(1, 'Ciudad es requerida'),
	line1: z.string().trim().min(1, 'Linea 1 es requerida'),
	line2: nullableText,
	county: nullableText,
	zip: nullableText,
});

export const companyAddressDeleteSchema = z.object({
	reason: z.string().trim().min(1).max(300).optional(),
});

export type CompanyAddressInputSchema = z.infer<typeof companyAddressSchema>;
export type CompanyAddressDeleteInputSchema = z.infer<
	typeof companyAddressDeleteSchema
>;
