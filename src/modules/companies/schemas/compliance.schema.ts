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
const requiredNumber = z.preprocess(numberFromUnknown, z.number().int());

const isoDate = z
	.string()
	.trim()
	.regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida (YYYY-MM-DD)')
	.nullable()
	.optional();

/** Dirección del agente custom (misma forma que las tablas de dirección). */
export const customAgentAddressSchema = z.object({
	country_id: nullableNumber.optional(),
	state_id: nullableNumber.optional(),
	county: nullableText,
	city: z.string().trim().min(1, 'Ciudad es requerida'),
	line1: z.string().trim().min(1, 'Linea 1 es requerida'),
	line2: nullableText,
	zip: nullableText,
});

/** Asignación de agente: del catálogo (registered_agent_id) O custom (nombre + dirección). */
export const assignRegisteredAgentSchema = z
	.object({
		registered_agent_id: nullableNumber.optional(),
		full_legal_name: nullableText,
		custom_address: customAgentAddressSchema.nullable().optional(),
		start_date: isoDate,
	})
	.refine(
		(value) =>
			Boolean(value.registered_agent_id) ||
			Boolean(value.full_legal_name && value.custom_address),
		{
			message: 'Selecciona un agente del catálogo o completa el agente custom',
		},
	);

export const terminateVigencySchema = z.object({
	end_date: isoDate,
});

export const designateResponsiblePartySchema = z.object({
	member_id: z.uuid('Member inválido'),
	title: nullableText,
	start_date: isoDate,
});

export const memberTaxIdentificationSchema = z.object({
	type: z.enum(['ssn', 'itin', 'ein', 'foreign']),
	number: z.string().trim().min(1, 'Número es requerido'),
	country_id: nullableNumber.optional(),
	is_primary: z.boolean().nullable().optional(),
});

export const internalAddressSchema = z.object({
	type: z.enum(['mailing', 'ein_request', 'virtual_address', 'other']),
	country_id: requiredNumber,
	state_id: nullableNumber.optional(),
	city: z.string().trim().min(1, 'Ciudad es requerida'),
	county: nullableText,
	line1: z.string().trim().min(1, 'Linea 1 es requerida'),
	line2: nullableText,
	zip: z.string().trim().min(1, 'Código postal es requerido'),
	service_plan_id: nullableNumber.optional(),
	is_active: z.boolean().optional(),
});

export const internalAddressUpdateSchema = internalAddressSchema.partial();

export const registeredAgentProviderSchema = z.object({
	name: z.string().trim().min(1, 'Nombre es requerido'),
	website: nullableText,
	email: nullableText,
	is_active: z.boolean().optional(),
});

export const registeredAgentCatalogSchema = z.object({
	provider_id: requiredNumber,
	state_id: requiredNumber,
	agent_name: z.string().trim().min(1, 'Nombre del agente es requerido'),
	line1: z.string().trim().min(1, 'Linea 1 es requerida'),
	line2: nullableText,
	city: z.string().trim().min(1, 'Ciudad es requerida'),
	zip: z.string().trim().min(1, 'Código postal es requerido'),
	is_active: z.boolean().optional(),
});
