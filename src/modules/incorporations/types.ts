import type { Company, CompanyTableRow, Country } from '@modules/companies/types';
import type { UsuarioItem as User } from '@modules/users/types';

export const STAGE_STATUS_MAP = {
  incorporation_process: ['pending', 'draft', 'sent', 'completed'],
  ein: ['not_requested', 'requested', 'received'],
  client_signature: ['pending', 'sent', 'signed'],
  boir: ['pending', 'in_progress', 'filed'],
  tax_classification: ['pending', 'defined'],
  bank_account: ['pending', 'in_progress', 'opened', 'rejected'],
} as const;

export type Stage = keyof typeof STAGE_STATUS_MAP;

export type StatusByStage = {
  [K in Stage]: (typeof STAGE_STATUS_MAP)[K][number];
};

export type Status = StatusByStage[Stage];

export interface IncorporationBase {
  id: string;
  submitted_form_id: string;
  company_id: string;
  user_id: string;
  order_id: number;
  possible_names: [string, string, string];
  notes: string;
  requires_manager_assignment: boolean;
  requires_us_address: boolean;
  ein_requested_at: Date | null;
  ein_received_at: Date | null;
  boir_filled_at: Date | null;
  created_at: Date;
  created_by: string;
  updated_at: Date | null;
  updated_by: string;
}

type StageStatusPair = {
  [K in Stage]: {
    current_stage: K;
    current_status: StatusByStage[K];
  };
}[Stage];

export type Incorporation = IncorporationBase & StageStatusPair;

export type IncorporationWithRawCompany = Incorporation & {
  company: Company | null;
};

export type IncorporationRelations = Omit<Incorporation, 'user_id' | 'company_id'> & {
  user: User | null;
  company: CompanyTableRow | null;
};

export function getStatusesForStage(stage: Stage) {
  return STAGE_STATUS_MAP[stage];
}
