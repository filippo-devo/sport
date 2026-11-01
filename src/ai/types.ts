// AI trainer data shapes, shared by the local engine and the server provider.

export type PlanProposalItem = { exerciseId: string; sets: number; target: string; restSec: number; weightKg?: number };
export type PlanProposalDay = { weekday: number; name: string; items: PlanProposalItem[] };
export type PlanProposal = { name: string; description: string; replacesPlanId?: string; days: PlanProposalDay[] };

export type CoachMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  at: number;
  plan?: PlanProposal;
  /** Id of the plan saved from this proposal, once the user saved it. */
  savedPlanId?: string;
  error?: boolean;
};

export type Insight = {
  id: string;
  tone: 'good' | 'info' | 'warn';
  title: string;
  body: string;
  /** In-app route that helps act on it. */
  action?: { label: string; href: string };
};
