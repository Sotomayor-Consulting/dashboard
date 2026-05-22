import type { SupabaseClient } from '@supabase/supabase-js';
import { recordAuditEvent } from '@domains/audit/audit-events';

export interface IncorporationDetailsInput {
	nombre_1?: string | null;
	nombre_2?: string | null;
	nombre_3?: string | null;
	tipo_de_negocio?: string | null;
	state_id?: number | string | null;
}

const cleanText = (value: unknown) => {
	if (typeof value !== 'string') return null;
	const trimmed = value.trim();
	return trimmed ? trimmed : null;
};

const cleanNumber = (value: unknown) => {
	if (typeof value === 'number' && Number.isInteger(value)) return value;
	if (typeof value !== 'string' || value.trim() === '') return null;
	const parsed = Number(value);
	return Number.isInteger(parsed) ? parsed : null;
};

const hasOwn = (input: object, field: string) =>
	Object.prototype.hasOwnProperty.call(input, field);

export async function updateIncorporationDetails(
	supabase: SupabaseClient,
	incorporationId: string,
	input: IncorporationDetailsInput,
	actorUserId: string,
) {
	const { data: before, error: beforeError } = await supabase
		.from('empresas_incorporaciones')
		.select(
			`empresa_incorporacion_id, company_id, nombre_1, nombre_2, nombre_3,
			tipo_de_negocio, state_id, updated_at`,
		)
		.eq('empresa_incorporacion_id', incorporationId)
		.maybeSingle();

	if (beforeError) throw beforeError;
	if (!before) throw new Error('INCORPORATION_NOT_FOUND');

	const payload = incorporationDetailsPayload(input);
	if (!Object.keys(payload).length) {
		throw new Error('NO_INCORPORATION_FIELDS_TO_UPDATE');
	}

	const { data: after, error } = await supabase
		.from('empresas_incorporaciones')
		.update({
			...payload,
			updated_at: new Date().toISOString(),
		})
		.eq('empresa_incorporacion_id', incorporationId)
		.select(
			`empresa_incorporacion_id, company_id, nombre_1, nombre_2, nombre_3,
			tipo_de_negocio, state_id, updated_at`,
		)
		.single();

	if (error) throw error;

	await recordAuditEvent({
		entityType: 'incorporation',
		entityId: incorporationId,
		action: 'update',
		changedBy: actorUserId,
		beforeData: before,
		afterData: after,
	});

	return after;
}

function incorporationDetailsPayload(input: IncorporationDetailsInput) {
	const payload: Record<string, string | number | null> = {};

	for (const field of ['nombre_1', 'nombre_2', 'nombre_3', 'tipo_de_negocio'] as const) {
		if (hasOwn(input, field)) payload[field] = cleanText(input[field]);
	}

	if (hasOwn(input, 'state_id')) {
		payload.state_id = cleanNumber(input.state_id);
	}

	return payload;
}
