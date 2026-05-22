import { z } from 'zod';

const nullableText = z
	.string()
	.trim()
	.transform((value) => (value.length ? value : null))
	.nullable()
	.optional();

export const companyAddressSchema = z.object({
	type: z.string().trim().min(1, 'Tipo es requerido'),
	country: z.string().trim().min(1, 'Pais es requerido'),
	city: z.string().trim().min(1, 'Ciudad es requerida'),
	line1: z.string().trim().min(1, 'Linea 1 es requerida'),
	line2: nullableText,
	county: nullableText,
	zip: nullableText,
	state_id: z.number().int().nullable().optional(),
	country_id: z.number().int().nullable().optional(),
});

export const companyAddressDeleteSchema = z.object({
	reason: z.string().trim().min(1).max(300).optional(),
});

export type CompanyAddressInputSchema = z.infer<typeof companyAddressSchema>;
export type CompanyAddressDeleteInputSchema = z.infer<
	typeof companyAddressDeleteSchema
>;
