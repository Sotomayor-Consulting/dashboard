import { z } from 'zod';

const UUID_RE =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const emptyToNull = (value: unknown) => {
	if (typeof value !== 'string') return value;
	const trimmed = value.trim();
	return trimmed === '' ? null : trimmed;
};

const percentagePreprocess = (value: unknown) => {
	if (value === '' || value === null || value === undefined) return null;
	if (typeof value === 'string') {
		const parsed = Number(value.replace(',', '.'));
		return Number.isFinite(parsed) ? parsed : null;
	}
	return value;
};

export const companyMemberSchema = z
	.object({
		member_id: z
			.string({ message: 'Selecciona o crea una persona' })
			.regex(UUID_RE, 'Selecciona o crea una persona'),
		percentage: z.preprocess(
			percentagePreprocess,
			z
				.number()
				.min(0, 'Mínimo 0%')
				.max(100, 'Máximo 100%')
				.nullable(),
		),
		start_date: z.preprocess(emptyToNull, z.string().nullable()),
		is_member: z.boolean(),
		is_manager: z.boolean(),
	})
	.refine((value) => value.is_member || value.is_manager, {
		message: 'Debe ser socio, manager o ambos',
		path: ['is_member'],
	});

export type CompanyMemberFormValues = z.input<typeof companyMemberSchema>;
export type CompanyMemberFormOutput = z.output<typeof companyMemberSchema>;
