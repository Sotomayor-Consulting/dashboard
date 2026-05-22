import { z } from 'zod';

const emptyToNull = (value: unknown) => {
	if (typeof value !== 'string') return value;
	const trimmed = value.trim();
	return trimmed === '' ? null : trimmed;
};

export const incorporationRegistrationSchema = z.object({
	nameOption1: z.preprocess(emptyToNull, z.string().nullable()),
	nameOption2: z.preprocess(emptyToNull, z.string().nullable()),
	nameOption3: z.preprocess(emptyToNull, z.string().nullable()),
	businessType: z.preprocess(emptyToNull, z.string().nullable()),
	stateId: z.preprocess((value) => {
		if (value === '' || value == null) return null;
		if (typeof value === 'string') return Number(value);
		return value;
	}, z.number().int().nullable()),
});

export const updateIncorporationDetailsRequestSchema = z.object({
	empresa_incorporacion_id: z.string().min(1, 'Empresa inválida'),
	name_option_1: z.string().nullable(),
	name_option_2: z.string().nullable(),
	name_option_3: z.string().nullable(),
	business_type: z.string().nullable(),
	state_id: z.number().int().nullable(),
});

export type IncorporationRegistrationInput = z.infer<
	typeof incorporationRegistrationSchema
>;

export type IncorporationRegistrationFormValues = z.input<
	typeof incorporationRegistrationSchema
>;

export type UpdateIncorporationDetailsRequest = z.infer<
	typeof updateIncorporationDetailsRequestSchema
>;
