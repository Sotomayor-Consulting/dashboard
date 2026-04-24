import type { UsuarioItem as User } from '@modules/users/types';
import type { WorkflowStatus } from '@lib/tablas/workflow';

export interface IncorporationRow {
	id: string;
	incorporation_id: string;
	user_id: string;
	possible_names: [string, string, string];
	business_type: string | null;
	state_of_incorporation: string | null;
	company_status: string | null;
	workflow_status: WorkflowStatus | null;
	current_stage_slug: string | null;
	current_stage_name: string | null;
	created_at: string | null;
	updated_at: string | null;
}

export type IncorporationRelations = IncorporationRow & {
	user: User | null;
};
