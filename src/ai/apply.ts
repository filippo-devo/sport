// Turns a plan proposal (from the AI trainer or a personal trainer) into the user's own plan.

import type { Lang, PlanSource, Program } from '../data/types';
import { useStore } from '../store';
import type { PlanProposal } from './types';

const both = (s: string) => ({ en: s, pl: s });

/**
 * Saves the proposal's workouts and weekly schedule. When it replaces one of the user's own plans
 * (`replacesPlanId`, or `existingId` for a coach plan update), that plan is updated in place and
 * the workouts it generated earlier are replaced.
 */
export function applyPlan(p: PlanProposal, opts: { source: PlanSource; activate: boolean; existingId?: string; lang?: Lang }): string {
  const s = useStore.getState();
  const targetId = opts.existingId ?? p.replacesPlanId;
  const existing = targetId ? s.programs.find((x) => x.id === targetId) : undefined;
  const oldRoutines = new Set((existing?.schedule ?? []).filter((r): r is string => !!r && s.routines.some((x) => x.id === r && x.source === opts.source)));

  const schedule: Program['schedule'] = [null, null, null, null, null, null, null];
  for (const day of p.days) {
    const id = s.saveRoutine({
      id: '',
      name: both(day.name),
      source: opts.source,
      items: day.items.map((i) => ({ exerciseId: i.exerciseId, sets: i.sets, target: i.target, restSec: i.restSec, ...(i.weightKg ? { weight: i.weightKg } : {}) })),
    });
    schedule[day.weekday] = id;
  }
  const programId = s.saveProgram({ id: existing?.id ?? '', name: both(p.name), description: both(p.description), schedule, source: opts.source });
  // Drop the routines the previous version of this plan generated (they're no longer scheduled).
  for (const r of oldRoutines) if (!schedule.includes(r)) useStore.getState().deleteRoutine(r);
  if (opts.activate) useStore.getState().setActiveProgram(programId);
  return programId;
}
