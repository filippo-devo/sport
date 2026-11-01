// Server side of the AI trainer: the Supabase Edge Function `ai-trainer` (supabase/functions/ai-trainer),
// which calls the Claude API with a key kept in Supabase secrets.

import { FunctionsHttpError } from '@supabase/supabase-js';

import { supabase } from '../backend/supabase';
import { EXERCISES } from '../data/exercises';
import type { AppState } from '../store';
import { getProgram, getRoutine, latestWeighIn, sessionVolume, sortedSessions } from '../store/derived';
import { goalProgress, goalWeekStreak, regularity } from '../store/stats';
import type { CoachMessage, PlanProposal } from './types';

const catalog = EXERCISES.map((e) => `${e.id}|${e.muscle}|${e.equipment}|${e.tracking}|${e.name.en}`).join('\n');

/** What the trainer knows about the user: profile, goals, the active plan and recent real workouts. */
export function trainerContext(s: AppState) {
  const program = getProgram(s.activeProgramId, s.programs);
  const recent = sortedSessions(s.sessions).slice(0, 12);
  return {
    catalog,
    profile: { name: s.settings.name, units: s.settings.units, bodyWeightKg: latestWeighIn(s.weighIns)?.kg ?? null, targetWeightKg: s.goals.targetWeight },
    goals: s.goals,
    activePlan: {
      id: program.id,
      editable: !!program.source && program.source !== 'builtin',
      name: program.name.en,
      days: program.schedule.map((rid, weekday) => {
        const r = getRoutine(rid, s.routines);
        return r ? { weekday, name: r.name.en, items: r.items } : null;
      }).filter(Boolean),
    },
    recent: {
      totalWorkouts: s.sessions.length,
      thisWeek: goalProgress(s.sessions, s.goals).week,
      regularity4w: regularity(s.sessions, s.goals.workoutsPerWeek),
      goalStreakWeeks: goalWeekStreak(s.sessions, s.goals.workoutsPerWeek).current,
      workouts: recent.map((w) => ({
        date: new Date(w.startedAt).toISOString().slice(0, 10),
        name: w.name.en,
        minutes: Math.round((w.endedAt - w.startedAt) / 60000),
        volumeKg: Math.round(sessionVolume(w)),
        exercises: w.exercises.map((e) => ({
          id: e.exerciseId,
          target: e.target,
          sets: e.sets.filter((x) => x.done).map((x) => (x.seconds ? `${x.seconds}s` : `${x.weight ?? 0}x${x.reps ?? 0}`)).join(' '),
        })),
      })),
    },
  };
}

/** The plan is sent back as text in later turns so the trainer remembers what it proposed. */
const planAsText = (p: PlanProposal) =>
  `[Proposed plan "${p.name}": ${p.days.map((d) => `day ${d.weekday} ${d.name} (${d.items.map((i) => `${i.exerciseId} ${i.sets}x${i.target}`).join(', ')})`).join('; ')}]`;

export type ChatError = 'not_configured' | 'sign_in_required' | 'daily_limit' | 'busy' | 'network' | 'server' | 'refused';

export async function askTrainer(s: AppState, history: CoachMessage[]): Promise<{ text: string; plan: PlanProposal | null } | { error: ChatError }> {
  if (!supabase) return { error: 'not_configured' };
  const messages = history
    .filter((m) => !m.error)
    .map((m) => ({ role: m.role, content: m.plan ? `${m.text}\n${planAsText(m.plan)}`.trim() : m.text }));
  try {
    const { data, error } = await supabase.functions.invoke('ai-trainer', { body: { lang: s.settings.lang, messages, context: trainerContext(s) } });
    if (error) {
      if (error instanceof FunctionsHttpError) {
        const body = await error.context.json().catch(() => ({}));
        const code = (body as { error?: string }).error;
        if (code === 'sign_in_required' || code === 'daily_limit' || code === 'busy' || code === 'not_configured') return { error: code };
        return { error: 'server' };
      }
      return { error: 'network' };
    }
    if (data?.refused) return { error: 'refused' };
    return { text: String(data?.text ?? ''), plan: (data?.plan as PlanProposal) ?? null };
  } catch {
    return { error: 'network' };
  }
}
