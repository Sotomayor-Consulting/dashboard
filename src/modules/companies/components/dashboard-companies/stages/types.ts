export const STAGE_KEYS = [
	'planning_meeting',
	'client_form',
	'state_registration',
	'fiscal_documents',
	'document_signing',
	'ein_request',
	'boir_registration',
	'bank_account',
	'stripe_account',
	'tax_election_8832',
	'be13',
] as const;

export type StageKey = (typeof STAGE_KEYS)[number];

export type StageStatus = 'completed' | 'in_progress' | 'pending' | 'waiting';

export interface StageItem {
	id: string;
	slug: string;
	name: string;
	status: StageStatus;
	displayOrder: number;
	dueAt: string | null;
}

export interface MeetingData {
	id: string;
	title: string;
	status: string;
	scheduled_at: string;
	duration_minutes: number;
	platform: string;
	meeting_url?: string;
	meeting_external_id?: string;
	meeting_passcode?: string;
	advisor_name?: string;
	advisor_email?: string;
}

export interface StageProps {
	stage: StageItem;
	empresaId: string;
	userId: string;
	meeting?: MeetingData | null;
}

export const STATUS_LABEL: Record<StageStatus, string> = {
	completed: 'Completado',
	in_progress: 'En proceso',
	waiting: 'En revisión',
	pending: 'Por completar',
};
