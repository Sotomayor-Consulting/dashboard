import type { StageKey } from './types';

import PlanningMeetingStage from './01-planning-meeting/PlanningMeetingStage.astro';
import ClientFormStage from './02-client-form/ClientFormStage.astro';
import StateRegistrationStage from './03-state-registration/StateRegistrationStage.astro';
import FiscalDocumentsStage from './04-fiscal-documents/FiscalDocumentsStage.astro';
import DocumentSigningStage from './05-document-signing/DocumentSigningStage.astro';
import EinRequestStage from './06-ein-request/EinRequestStage.astro';
import BoirRegistrationStage from './07-boir-registration/BoirRegistrationStage.astro';
import BankAccountStage from './08-bank-account/BankAccountStage.astro';
import StripeAccountStage from './09-stripe-account/StripeAccountStage.astro';
import TaxElection8832Stage from './10-tax-election-8832/TaxElection8832Stage.astro';
import Be13Stage from './11-be13/Be13Stage.astro';

// Astro no exporta un tipo público para componentes; usar `any` para el registry.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type StageComponent = any;

export const STAGE_REGISTRY: Record<StageKey, StageComponent> = {
	planning_meeting: PlanningMeetingStage,
	client_form: ClientFormStage,
	state_registration: StateRegistrationStage,
	fiscal_documents: FiscalDocumentsStage,
	document_signing: DocumentSigningStage,
	ein_request: EinRequestStage,
	boir_registration: BoirRegistrationStage,
	bank_account: BankAccountStage,
	stripe_account: StripeAccountStage,
	tax_election_8832: TaxElection8832Stage,
	be13: Be13Stage,
};

export const isKnownStage = (slug: string): slug is StageKey =>
	slug in STAGE_REGISTRY;
