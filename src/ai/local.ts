// On-device trainer logic: a rule-based plan generator and recommendations computed from the
// user's real logs. Works offline; the server chat (remote.ts) adds conversation on top.

import { EXERCISES } from '../data/exercises';
import type { Equipment, Exercise, Lang, Muscle, Session } from '../data/types';
import { makeT, type TKey } from '../i18n';
import { addDays, dayKey, startOfDay, weekdayIndex } from '../lib/date';
import { formatNumber } from '../lib/units';
import type { AppState } from '../store';
import { getProgram, lastPerformance, mealsOn, planWeek, sumNutrients } from '../store/derived';
import { goalProgress } from '../store/stats';
import type { Insight, PlanProposal, PlanProposalDay, PlanProposalItem } from './types';

export type Goal = 'strength' | 'muscle' | 'general';
export type Setup = 'gym' | 'dumbbells' | 'bodyweight';
export type PlanRequest = { goal: Goal; days: number; setup: Setup };

const EQUIPMENT: Record<Setup, Equipment[]> = {
  gym: ['barbell', 'dumbbell', 'cable', 'machine', 'bodyweight', 'kettlebell'],
  dumbbells: ['dumbbell', 'bodyweight', 'band', 'kettlebell'],
  bodyweight: ['bodyweight', 'band'],
};

/** Muscles per session type, in the order exercises are added (big lifts first). */
const SESSIONS: Record<string, Muscle[]> = {
  fullA: ['quads', 'chest', 'back', 'shoulders', 'hamstrings', 'core'],
  fullB: ['hamstrings', 'back', 'chest', 'glutes', 'triceps', 'biceps'],
  fullC: ['quads', 'shoulders', 'back', 'chest', 'calves', 'core'],
  upper: ['chest', 'back', 'shoulders', 'back', 'triceps', 'biceps'],
  lower: ['quads', 'hamstrings', 'glutes', 'calves', 'core'],
  push: ['chest', 'shoulders', 'chest', 'triceps', 'shoulders'],
  pull: ['back', 'back', 'biceps', 'forearms', 'core'],
  legs: ['quads', 'hamstrings', 'glutes', 'quads', 'calves'],
};

/** Which sessions on which weekdays (0 = Monday) for each training frequency. */
const LAYOUTS: Record<number, [number, string][]> = {
  2: [[0, 'fullA'], [3, 'fullB']],
  3: [[0, 'fullA'], [2, 'fullB'], [4, 'fullC']],
  4: [[0, 'upper'], [1, 'lower'], [3, 'upper'], [4, 'lower']],
  5: [[0, 'push'], [1, 'pull'], [2, 'legs'], [4, 'upper'], [5, 'lower']],
  6: [[0, 'push'], [1, 'pull'], [2, 'legs'], [3, 'push'], [4, 'pull'], [5, 'legs']],
};

const SCHEME: Record<Goal, { main: string; acc: string; restMain: number; restAcc: number; setsMain: number; setsAcc: number }> = {
  strength: { main: '4-6', acc: '8-10', restMain: 180, restAcc: 90, setsMain: 4, setsAcc: 3 },
  muscle: { main: '6-8', acc: '10-12', restMain: 120, restAcc: 75, setsMain: 3, setsAcc: 3 },
  general: { main: '8-10', acc: '12-15', restMain: 90, restAcc: 60, setsMain: 3, setsAcc: 2 },
};

const isCompound = (e: Exercise) => e.secondary.length >= 2 || ['barbell'].includes(e.equipment);

/** Builds a weekly plan from the exercise library; weights come from the user's last logged sets. */
export function generatePlan(req: PlanRequest, sessions: Session[], lang: Lang): PlanProposal {
  const { t } = makeT(lang);
  const allowed = new Set(EQUIPMENT[req.setup]);
  const pool = EXERCISES.filter((e) => allowed.has(e.equipment));
  const scheme = SCHEME[req.goal];
  const layout = LAYOUTS[Math.min(6, Math.max(2, req.days))];
  // Rotate variations between sessions of the same type so A/B days differ.
  const usage = new Map<string, number>();

  const days: PlanProposalDay[] = layout.map(([weekday, kind]) => {
    const picked = new Set<string>();
    const items: PlanProposalItem[] = [];
    SESSIONS[kind].forEach((muscle, idx) => {
      const options = pool
        .filter((e) => e.muscle === muscle && !picked.has(e.id))
        // Compounds first for the first slots, then the least-used variation.
        .sort((a, b) => (idx < 2 ? Number(isCompound(b)) - Number(isCompound(a)) : 0) || (usage.get(a.id) ?? 0) - (usage.get(b.id) ?? 0));
      const ex = options[0];
      if (!ex) return;
      picked.add(ex.id);
      usage.set(ex.id, (usage.get(ex.id) ?? 0) + 1);
      const main = idx < 2 && ex.tracking === 'weightReps';
      const item: PlanProposalItem = {
        exerciseId: ex.id,
        sets: main ? scheme.setsMain : scheme.setsAcc,
        target: ex.tracking === 'time' ? '45' : main ? scheme.main : scheme.acc,
        restSec: main ? scheme.restMain : scheme.restAcc,
      };
      const prev = ex.tracking === 'weightReps' ? lastPerformance(sessions, ex.id) : undefined;
      const top = prev ? Math.max(0, ...prev.sets.filter((s) => s.done).map((s) => s.weight ?? 0)) : 0;
      if (top > 0) item.weightKg = top;
      items.push(item);
    });
    return { weekday, name: t(`aiPlan.${kind}` as TKey), items };
  });

  return {
    name: t('aiPlan.name', { goal: t(`aiPlan.goal.${req.goal}` as TKey), n: layout.length }),
    description: t('aiPlan.description', { goal: t(`aiPlan.goal.${req.goal}` as TKey).toLowerCase(), n: layout.length, setup: t(`aiPlan.setup.${req.setup}` as TKey).toLowerCase() }),
    days,
  };
}

const MAJOR: Muscle[] = ['chest', 'back', 'shoulders', 'quads', 'hamstrings', 'glutes'];
const topReps = (target?: string) => Number((target ?? '').split(/[-–]/).pop()) || 0;

/** Recommendations from what the user logged. Empty logs give a single "start" tip, never made-up advice. */
export function insights(s: AppState, now = new Date()): Insight[] {
  const { t, L } = makeT(s.settings.lang);
  const out: Insight[] = [];
  const sessions = [...s.sessions].sort((a, b) => b.startedAt - a.startedAt);

  if (sessions.length === 0) {
    out.push({ id: 'start', tone: 'info', title: t('insight.startTitle'), body: t('insight.startBody'), action: { label: t('insight.openTrain'), href: '/train' } });
  } else {
    // Weekly goal pace.
    const g = goalProgress(s.sessions, s.goals, now).week;
    const daysLeft = 7 - weekdayIndex(now) - 1;
    if (g.done >= g.goal) out.push({ id: 'goal', tone: 'good', title: t('insight.goalMetTitle'), body: t('insight.goalMetBody', { n: g.done }) });
    else if (g.goal - g.done > daysLeft + 1)
      out.push({ id: 'goal', tone: 'warn', title: t('insight.goalRiskTitle'), body: t('insight.goalRiskBody', { done: g.done, goal: g.goal }) });

    // Planned days this week that passed without a workout.
    const missed = planWeek(getProgram(s.activeProgramId, s.programs), s.sessions, now, s.routines).filter((d) => d.status === 'missed');
    if (missed.length)
      out.push({ id: 'missed', tone: 'warn', title: t('insight.missedTitle'), body: t('insight.missedBody', { n: missed.length }), action: { label: t('insight.openTrain'), href: '/train' } });

    // Progressive overload: every set of the last session hit the top of the rep range.
    const seen = new Set<string>();
    for (const sess of sessions.slice(0, 6)) {
      for (const e of sess.exercises) {
        if (seen.has(e.exerciseId)) continue;
        seen.add(e.exerciseId);
        const done = e.sets.filter((x) => x.done && x.weight && x.reps);
        const top = topReps(e.target);
        if (done.length >= 2 && top > 0 && done.every((x) => (x.reps ?? 0) >= top)) {
          const ex = EXERCISES.find((x) => x.id === e.exerciseId);
          const w = Math.max(...done.map((x) => x.weight ?? 0));
          if (ex && out.filter((x) => x.id.startsWith('prog-')).length < 3)
            out.push({
              id: `prog-${ex.id}`,
              tone: 'good',
              title: t('insight.progressTitle', { name: L(ex.name) }),
              body: t('insight.progressBody', { reps: top, w: formatNumber(w, 1), next: formatNumber(w + (ex.equipment === 'dumbbell' ? 2 : 2.5), 1) }),
              action: { label: t('insight.openExercise'), href: `/exercise/${ex.id}` },
            });
        }
      }
    }

    // Major muscles without any sets in the last 14 days (only once there's two weeks of history).
    const since = addDays(startOfDay(now), -14).getTime();
    if (sessions[sessions.length - 1].startedAt < since) {
      const trained = new Set<Muscle>();
      for (const sess of sessions.filter((x) => x.startedAt >= since))
        for (const e of sess.exercises) {
          const ex = EXERCISES.find((x) => x.id === e.exerciseId);
          if (ex && e.sets.some((x) => x.done)) trained.add(ex.muscle);
        }
      const gaps = MAJOR.filter((m) => !trained.has(m));
      if (gaps.length)
        out.push({
          id: 'gaps',
          tone: 'info',
          title: t('insight.gapsTitle'),
          body: t('insight.gapsBody', { list: gaps.map((m) => t(`muscle.${m}` as TKey)).join(', ') }),
          action: { label: t('insight.openLibrary'), href: '/library' },
        });
    }
  }

  // Protein over the last 7 days that have meals logged.
  const days = Array.from({ length: 7 }, (_, i) => dayKey(addDays(startOfDay(now), -i - 1)));
  const logged = days.map((k) => sumNutrients(mealsOn(s.meals, k))).filter((n) => n.kcal > 0);
  if (logged.length >= 3) {
    const avg = logged.reduce((n, x) => n + x.protein, 0) / logged.length;
    if (avg < s.goals.protein * 0.8)
      out.push({ id: 'protein', tone: 'warn', title: t('insight.proteinTitle'), body: t('insight.proteinBody', { avg: Math.round(avg), goal: s.goals.protein }), action: { label: t('insight.openFood'), href: '/food' } });
  }
  return out;
}
