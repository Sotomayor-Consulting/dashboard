import { z } from 'zod';

const emptyToNull = (value: unknown) => {
	if (typeof value !== 'string') return value;
	const trimmed = value.trim();
	return trimmed === '' ? null : trimmed;
};

const numericPreprocess = (value: unknown) => {
	if (value === '' || value === null || value === undefined) return null;
	if (typeof value === 'string') {
		const parsed = Number(value);
		return Number.isFinite(parsed) ? parsed : null;
	}
	return value;
};

export const personTypeSchema = z.enum(['natural_person', 'juridical_person']);
export const identificationTypeSchema = z.enum([
	'passport',
	'national_id',
	'driver_licence',
	'ein',
]);
export const maritalStatusSchema = z.enum([
	'single',
	'married',
	'widowed',
	'divorced',
	'legally_separated',
	'civil_union',
	'annulled',
]);

export const memberSchema = z
	.object({
		person_type: personTypeSchema,
		first_name: z.preprocess(emptyToNull, z.string().nullable()),
		last_name: z.preprocess(emptyToNull, z.string().nullable()),
		name: z.preprocess(emptyToNull, z.string().nullable()),
		birth_date: z.preprocess(emptyToNull, z.string().nullable()),
		incorporation_date: z.preprocess(emptyToNull, z.string().nullable()),
		identification_type: identificationTypeSchema,
		identification_number: z.preprocess(emptyToNull, z.string().nullable()),
		country_nationality_id: z.preprocess(
			numericPreprocess,
			z.number().int().nullable(),
		),
		country_residence_id: z.preprocess(
			numericPreprocess,
			z.number().int().nullable(),
		),
		marital_status: maritalStatusSchema.nullable(),
		ssn: z.preprocess(emptyToNull, z.string().nullable()),
		itin: z.preprocess(emptyToNull, z.string().nullable()),
	})
	.refine(
		(value) =>
			value.person_type === 'juridical_person'
				? !!value.name
				: !!(value.first_name || value.last_name),
		{
			message: 'El nombre es obligatorio',
			path: ['first_name'],
		},
	);

export type MemberFormValues = z.input<typeof memberSchema>;
export type MemberFormOutput = z.output<typeof memberSchema>;
