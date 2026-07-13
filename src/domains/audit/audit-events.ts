import { supabaseAdmin } from '@infrastructure/supabase/admin';
import { createLogger } from '@infrastructure/logging';

const log = createLogger('domains.audit-events');

export type AuditAction =
	| 'create'
	| 'update'
	| 'soft_delete'
	| 'restore';

interface AuditEventInput {
	entityType: string;
	entityId: string;
	action: AuditAction;
	changedBy: string;
	parentType?: string | null;
	parentId?: string | null;
	beforeData?: unknown;
	afterData?: unknown;
}

export async function recordAuditEvent(input: AuditEventInput) {
	const { error } = await supabaseAdmin.from('audit_events').insert({
		entity_type: input.entityType,
		entity_id: input.entityId,
		parent_type: input.parentType ?? null,
		parent_id: input.parentId ?? null,
		action: input.action,
		before_data: input.beforeData ?? null,
		after_data: input.afterData ?? null,
		changed_by: input.changedBy,
	});

	if (error) {
		log.error('insert failed', { error });
		throw error;
	}
}
