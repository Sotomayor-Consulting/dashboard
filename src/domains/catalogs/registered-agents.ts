import type { SupabaseClient } from '@supabase/supabase-js';
import { recordAuditEvent } from '@domains/audit/audit-events';

export interface RegisteredAgentProviderRow {
	id: number;
	name: string;
	website: string | null;
	email: string | null;
	is_active: boolean;
	created_at: string;
	updated_at: string | null;
}

export interface RegisteredAgentRow {
	id: number;
	provider_id: number;
	state_id: number;
	agent_name: string;
	line1: string;
	line2: string | null;
	city: string;
	zip: string;
	is_active: boolean;
	created_at: string;
	updated_at: string | null;
	provider?: { id: number; name: string } | null;
	state_name?: string | null;
}

export interface RegisteredAgentProviderInput {
	name?: string | null | undefined;
	website?: string | null | undefined;
	email?: string | null | undefined;
	is_active?: boolean | undefined;
}

export interface RegisteredAgentInput {
	provider_id?: number | null | undefined;
	state_id?: number | null | undefined;
	agent_name?: string | null | undefined;
	line1?: string | null | undefined;
	line2?: string | null | undefined;
	city?: string | null | undefined;
	zip?: string | null | undefined;
	is_active?: boolean | undefined;
}

const cleanText = (value: unknown) => {
	if (typeof value !== 'string') return null;
	const trimmed = value.trim();
	return trimmed ? trimmed : null;
};

const AGENT_SELECT = `*, provider:provider_id ( id, name )`;

const mapAgent = (row: any): RegisteredAgentRow => ({
	...row,
	provider: Array.isArray(row.provider)
		? (row.provider[0] ?? null)
		: (row.provider ?? null),
});

/** Añade el nombre del estado vía lookup en public.states (los embeds cross-schema no resuelven desde catalogs). */
async function attachStateNames(
	supabase: SupabaseClient,
	agents: RegisteredAgentRow[],
): Promise<RegisteredAgentRow[]> {
	const stateIds = [...new Set(agents.map((a) => a.state_id))];
	if (!stateIds.length) return agents;

	const { data, error } = await supabase
		.from('states')
		.select('id, name')
		.in('id', stateIds);
	if (error) throw error;

	const names = new Map(
		(data ?? []).map((s) => [s.id as number, s.name as string]),
	);
	return agents.map((a) => ({
		...a,
		state_name: names.get(a.state_id) ?? null,
	}));
}

export async function listRegisteredAgentProviders(
	supabase: SupabaseClient,
	options: { includeInactive?: boolean } = {},
): Promise<RegisteredAgentProviderRow[]> {
	let query = supabase
		.schema('catalogs')
		.from('registered_agent_providers')
		.select('*')
		.order('name', { ascending: true });
	if (!options.includeInactive) query = query.eq('is_active', true);

	const { data, error } = await query;
	if (error) throw error;
	return (data ?? []) as RegisteredAgentProviderRow[];
}

export async function createRegisteredAgentProvider(
	supabase: SupabaseClient,
	input: RegisteredAgentProviderInput,
	actorUserId: string,
): Promise<RegisteredAgentProviderRow> {
	const name = cleanText(input.name);
	if (!name) throw new Error('PROVIDER_NAME_REQUIRED');

	const { data, error } = await supabase
		.schema('catalogs')
		.from('registered_agent_providers')
		.insert({
			name,
			website: cleanText(input.website),
			email: cleanText(input.email),
		})
		.select('*')
		.single<RegisteredAgentProviderRow>();
	if (error) throw error;

	await recordAuditEvent({
		entityType: 'registered_agent_provider',
		entityId: String(data.id),
		action: 'create',
		changedBy: actorUserId,
		afterData: data,
	});
	return data;
}

export async function updateRegisteredAgentProvider(
	supabase: SupabaseClient,
	providerId: number,
	input: RegisteredAgentProviderInput,
	actorUserId: string,
): Promise<RegisteredAgentProviderRow> {
	const payload: Record<string, unknown> = {
		updated_at: new Date().toISOString(),
	};
	if (input.name !== undefined) {
		const name = cleanText(input.name);
		if (!name) throw new Error('PROVIDER_NAME_REQUIRED');
		payload.name = name;
	}
	if (input.website !== undefined) payload.website = cleanText(input.website);
	if (input.email !== undefined) payload.email = cleanText(input.email);
	if (input.is_active !== undefined) payload.is_active = input.is_active;

	const { data, error } = await supabase
		.schema('catalogs')
		.from('registered_agent_providers')
		.update(payload)
		.eq('id', providerId)
		.select('*')
		.single<RegisteredAgentProviderRow>();
	if (error) throw error;

	await recordAuditEvent({
		entityType: 'registered_agent_provider',
		entityId: String(data.id),
		action: 'update',
		changedBy: actorUserId,
		afterData: data,
	});
	return data;
}

export async function listRegisteredAgents(
	supabase: SupabaseClient,
	options: { stateId?: number | null; includeInactive?: boolean } = {},
): Promise<RegisteredAgentRow[]> {
	let query = supabase
		.schema('catalogs')
		.from('registered_agents')
		.select(AGENT_SELECT)
		.order('agent_name', { ascending: true });
	if (!options.includeInactive) query = query.eq('is_active', true);
	if (options.stateId) query = query.eq('state_id', options.stateId);

	const { data, error } = await query;
	if (error) throw error;
	return attachStateNames(supabase, (data ?? []).map(mapAgent));
}

export async function getRegisteredAgentById(
	supabase: SupabaseClient,
	agentId: number,
): Promise<RegisteredAgentRow | null> {
	const { data, error } = await supabase
		.schema('catalogs')
		.from('registered_agents')
		.select(AGENT_SELECT)
		.eq('id', agentId)
		.maybeSingle();
	if (error) throw error;
	if (!data) return null;

	const [agent] = await attachStateNames(supabase, [mapAgent(data)]);
	return agent ?? null;
}

export async function createRegisteredAgent(
	supabase: SupabaseClient,
	input: RegisteredAgentInput,
	actorUserId: string,
): Promise<RegisteredAgentRow> {
	const agentName = cleanText(input.agent_name);
	const line1 = cleanText(input.line1);
	const city = cleanText(input.city);
	const zip = cleanText(input.zip);
	if (!input.provider_id) throw new Error('PROVIDER_REQUIRED');
	if (!input.state_id) throw new Error('STATE_REQUIRED');
	if (!agentName) throw new Error('AGENT_NAME_REQUIRED');
	if (!line1 || !city || !zip) throw new Error('AGENT_ADDRESS_REQUIRED');

	const { data, error } = await supabase
		.schema('catalogs')
		.from('registered_agents')
		.insert({
			provider_id: input.provider_id,
			state_id: input.state_id,
			agent_name: agentName,
			line1,
			line2: cleanText(input.line2),
			city,
			zip,
		})
		.select(AGENT_SELECT)
		.single();
	if (error) throw error;

	const agent = mapAgent(data);
	await recordAuditEvent({
		entityType: 'registered_agent',
		entityId: String(agent.id),
		parentType: 'registered_agent_provider',
		parentId: String(agent.provider_id),
		action: 'create',
		changedBy: actorUserId,
		afterData: agent,
	});

	const [resolved] = await attachStateNames(supabase, [agent]);
	return resolved ?? agent;
}

export async function updateRegisteredAgent(
	supabase: SupabaseClient,
	agentId: number,
	input: RegisteredAgentInput,
	actorUserId: string,
): Promise<RegisteredAgentRow> {
	const payload: Record<string, unknown> = {
		updated_at: new Date().toISOString(),
	};
	if (input.agent_name !== undefined) {
		const name = cleanText(input.agent_name);
		if (!name) throw new Error('AGENT_NAME_REQUIRED');
		payload.agent_name = name;
	}
	if (input.line1 !== undefined) payload.line1 = cleanText(input.line1);
	if (input.line2 !== undefined) payload.line2 = cleanText(input.line2);
	if (input.city !== undefined) payload.city = cleanText(input.city);
	if (input.zip !== undefined) payload.zip = cleanText(input.zip);
	if (input.is_active !== undefined) payload.is_active = input.is_active;

	const { data, error } = await supabase
		.schema('catalogs')
		.from('registered_agents')
		.update(payload)
		.eq('id', agentId)
		.select(AGENT_SELECT)
		.single();
	if (error) throw error;

	const agent = mapAgent(data);
	await recordAuditEvent({
		entityType: 'registered_agent',
		entityId: String(agent.id),
		action: 'update',
		changedBy: actorUserId,
		afterData: agent,
	});

	const [resolved] = await attachStateNames(supabase, [agent]);
	return resolved ?? agent;
}
