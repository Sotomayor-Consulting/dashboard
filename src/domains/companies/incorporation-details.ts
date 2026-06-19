import type { SupabaseClient } from '@supabase/supabase-js';
import { recordAuditEvent } from '@domains/audit/audit-events';

export interface IncorporationDetailsInput {
	/** Nombre canónico (opción preferida). */
	principal_name?: string | null;
	/** Opciones de nombre consideradas (se deduplica y limpia). */
	possible_names?: (string | null | undefined)[] | null;
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
		.from('incorporations')
		.select(
			`id, company_id, principal_name, possible_names,
			tipo_de_negocio, state_id, updated_at`,
		)
		.eq('id', incorporationId)
		.maybeSingle();

	if (beforeError) throw beforeError;
	if (!before) throw new Error('INCORPORATION_NOT_FOUND');

	const payload = incorporationDetailsPayload(input);
	if (!Object.keys(payload).length) {
		throw new Error('NO_INCORPORATION_FIELDS_TO_UPDATE');
	}

	const { data: after, error } = await supabase
		.from('incorporations')
		.update({
			...payload,
			updated_at: new Date().toISOString(),
		})
		.eq('id', incorporationId)
		.select(
			`id, company_id, principal_name, possible_names,
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
	const payload: Record<string, string | number | string[] | null> = {};

	for (const field of ['principal_name', 'tipo_de_negocio'] as const) {
		if (hasOwn(input, field)) payload[field] = cleanText(input[field]);
	}

	if (hasOwn(input, 'possible_names')) {
		payload.possible_names = [
			...new Set(
				(input.possible_names ?? [])
					.map((n) => (typeof n === 'string' ? n.trim() : ''))
					.filter(Boolean),
			),
		];
	}

	if (hasOwn(input, 'state_id')) {
		payload.state_id = cleanNumber(input.state_id);
	}

	return payload;
}
