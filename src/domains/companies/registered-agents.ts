import type { SupabaseClient } from '@supabase/supabase-js';
import { recordAuditEvent } from '@domains/audit/audit-events';
import {
	getRegisteredAgentById,
	type RegisteredAgentRow,
} from '@domains/catalogs/registered-agents';

export interface CustomAgentAddress {
	country_id?: number | null | undefined;
	state_id?: number | null | undefined;
	county?: string | null | undefined;
	city?: string | null | undefined;
	line1?: string | null | undefined;
	line2?: string | null | undefined;
	zip?: string | null | undefined;
}

export interface CompanyRegisteredAgentRow {
	id: string;
	company_id: string;
	registered_agent_id: number | null;
	full_legal_name: string | null;
	custom_address: CustomAgentAddress | null;
	start_date: string;
	end_date: string | null;
	created_at: string;
	updated_at: string | null;
	/** Resuelto desde el catálogo cuando registered_agent_id no es null. */
	agent?: RegisteredAgentRow | null;
}

export interface AssignRegisteredAgentInput {
	registered_agent_id?: number | null | undefined;
	full_legal_name?: string | null | undefined;
	custom_address?: CustomAgentAddress | null | undefined;
	start_date?: string | null | undefined;
}

const cleanText = (value: unknown) => {
	if (typeof value !== 'string') return null;
	const trimmed = value.trim();
	return trimmed ? trimmed : null;
};

const today = () => new Date().toISOString().slice(0, 10);

async function resolveAgents(
	supabase: SupabaseClient,
	rows: CompanyRegisteredAgentRow[],
): Promise<CompanyRegisteredAgentRow[]> {
	const resolved: CompanyRegisteredAgentRow[] = [];
	const cache = new Map<number, RegisteredAgentRow | null>();

	for (const row of rows) {
		if (!row.registered_agent_id) {
			resolved.push({ ...row, agent: null });
			continue;
		}
		if (!cache.has(row.registered_agent_id)) {
			cache.set(
				row.registered_agent_id,
				await getRegisteredAgentById(supabase, row.registered_agent_id),
			);
		}
		resolved.push({
			...row,
			agent: cache.get(row.registered_agent_id) ?? null,
		});
	}
	return resolved;
}

/** Agente vigente de la empresa (end_date null) o null. */
export async function getCurrentCompanyRegisteredAgent(
	supabase: SupabaseClient,
	companyId: string,
): Promise<CompanyRegisteredAgentRow | null> {
	const { data, error } = await supabase
		.from('company_registered_agents')
		.select('*')
		.eq('company_id', companyId)
		.is('end_date', null)
		.maybeSingle<CompanyRegisteredAgentRow>();
	if (error) throw error;
	if (!data) return null;

	const [resolved] = await resolveAgents(supabase, [data]);
	return resolved ?? null;
}

/** Historial completo de asignaciones (vigente primero). */
export async function listCompanyRegisteredAgentHistory(
	supabase: SupabaseClient,
	companyId: string,
): Promise<CompanyRegisteredAgentRow[]> {
	const { data, error } = await supabase
		.from('company_registered_agents')
		.select('*')
		.eq('company_id', companyId)
		.order('start_date', { ascending: false });
	if (error) throw error;
	return resolveAgents(supabase, (data ?? []) as CompanyRegisteredAgentRow[]);
}

/**
 * Asigna un agente (del catálogo o custom). Cierra la vigencia del actual (si existe)
 * e inserta la nueva fila — el cambio de agente es un evento legal, no un update.
 */
export async function assignCompanyRegisteredAgent(
	supabase: SupabaseClient,
	companyId: string,
	input: AssignRegisteredAgentInput,
	actorUserId: string,
): Promise<CompanyRegisteredAgentRow> {
	const startDate = cleanText(input.start_date) ?? today();
	const agentId = input.registered_agent_id ?? null;
	const customName = cleanText(input.full_legal_name);
	const customAddress = input.custom_address ?? null;

	if (agentId) {
		const agent = await getRegisteredAgentById(supabase, agentId);
		if (!agent || !agent.is_active)
			throw new Error('REGISTERED_AGENT_NOT_FOUND');
	} else {
		if (!customName) throw new Error('CUSTOM_AGENT_NAME_REQUIRED');
		if (
			!customAddress ||
			!cleanText(customAddress.line1) ||
			!cleanText(customAddress.city)
		) {
			throw new Error('CUSTOM_AGENT_ADDRESS_REQUIRED');
		}
	}

	const current = await getCurrentCompanyRegisteredAgent(supabase, companyId);
	if (current) {
		const { error: closeError } = await supabase
			.from('company_registered_agents')
			.update({ end_date: startDate, updated_at: new Date().toISOString() })
			.eq('id', current.id)
			.is('end_date', null);
		if (closeError) throw closeError;

		await recordAuditEvent({
			entityType: 'company_registered_agent',
			entityId: current.id,
			parentType: 'company',
			parentId: companyId,
			action: 'update',
			changedBy: actorUserId,
			beforeData: current,
			afterData: { ...current, end_date: startDate },
		});
	}

	const { data, error } = await supabase
		.from('company_registered_agents')
		.insert({
			company_id: companyId,
			registered_agent_id: agentId,
			full_legal_name: agentId ? null : customName,
			custom_address: agentId ? null : customAddress,
			start_date: startDate,
		})
		.select('*')
		.single<CompanyRegisteredAgentRow>();
	if (error) throw error;

	await recordAuditEvent({
		entityType: 'company_registered_agent',
		entityId: data.id,
		parentType: 'company',
		parentId: companyId,
		action: 'create',
		changedBy: actorUserId,
		afterData: data,
	});

	const [resolved] = await resolveAgents(supabase, [data]);
	return resolved ?? data;
}

/** Cierra la vigencia del agente actual sin asignar reemplazo. */
export async function terminateCompanyRegisteredAgent(
	supabase: SupabaseClient,
	companyId: string,
	actorUserId: string,
	endDate?: string | null,
): Promise<CompanyRegisteredAgentRow> {
	const current = await getCurrentCompanyRegisteredAgent(supabase, companyId);
	if (!current) throw new Error('COMPANY_REGISTERED_AGENT_NOT_FOUND');

	const effectiveEnd = cleanText(endDate) ?? today();
	const { data, error } = await supabase
		.from('company_registered_agents')
		.update({ end_date: effectiveEnd, updated_at: new Date().toISOString() })
		.eq('id', current.id)
		.is('end_date', null)
		.select('*')
		.single<CompanyRegisteredAgentRow>();
	if (error) throw error;

	await recordAuditEvent({
		entityType: 'company_registered_agent',
		entityId: data.id,
		parentType: 'company',
		parentId: companyId,
		action: 'update',
		changedBy: actorUserId,
		beforeData: current,
		afterData: data,
	});

	const [resolved] = await resolveAgents(supabase, [data]);
	return resolved ?? data;
}
