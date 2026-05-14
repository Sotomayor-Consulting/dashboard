import PlanningMeetingOps from './01-planning-meeting/PlanningMeetingOps.astro';
import OpsGenericStage from './OpsGenericStage.astro';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type OpsStageComponent = any;

export const OPS_STAGE_REGISTRY: Record<string, OpsStageComponent> = {
	planning_meeting: PlanningMeetingOps,
};

export const resolveOpsStageComponent = (slug: string): OpsStageComponent =>
	OPS_STAGE_REGISTRY[slug] ?? OpsGenericStage;
