// Pure calculations over stored data (records, volume, recovery, nutrition).
import { EXERCISE_BY_ID } from '../data/exercises';
import { FOOD_BY_ID } from '../data/foods';
import { PROGRAMS, ROUTINES } from '../data/programs';
import type { MealEntry, Muscle, Program, Routine, Session, SessionExercise, SetEntry, WeighIn } from '../data/types';
import { addDays, dayKey, fromKey, startOfDay, startOfWeek, weekdayIndex } from '../lib/date';

/** Epley estimate; only meaningful up to ~12 reps. */
export function e1rm(weight: number, reps: number): number {
  if (!weight || !reps) return 0;
  return reps === 1 ? weight : weight * (1 + Math.min(reps, 12) / 30);
}

export const setVolume = (s: SetEntry) => (s.done && s.weight && s.reps ? s.weight * s.reps : 0);

export const exerciseVolume = (e: SessionExercise) => e.sets.reduce((n, s) => n + setVolume(s), 0);

export const sessionVolume = (s: Session) => s.exercises.reduce((n, e) => n + exerciseVolume(e), 0);

export const doneSets = (exs: SessionExercise[]) => exs.reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0);

export const sortedSessions = (sessions: Session[]) => [...sessions].sort((a, b) => b.startedAt - a.startedAt);

/** Most recent performance of an exercise (optionally before a timestamp). */
export function lastPerformance(sessions: Session[], exerciseId: string, before = Infinity): SessionExercise | undefined {
  let best: { at: number; ex: SessionExercise } | undefined;
  for (const s of sessions) {
    if (s.startedAt >= before) continue;
    const ex = s.exercises.find((e) => e.exerciseId === exerciseId && e.sets.some((x) => x.done));
    if (ex && (!best || s.startedAt > best.at)) best = { at: s.startedAt, ex };
  }
  return best?.ex;
}

export type Best = { e1rm: number; weight: number; reps: number; seconds: number; date: number; sessionId: string };

function bestOf(sessions: Session[], exerciseId: string, before = Infinity): Best | undefined {
  let best: Best | undefined;
  for (const s of sessions) {
    if (s.startedAt >= before) continue;
    for (const e of s.exercises) {
      if (e.exerciseId !== exerciseId) continue;
      for (const set of e.sets) {
        if (!set.done) continue;
        const score = set.weight ? e1rm(set.weight, set.reps ?? 0) : 0;
        const cand: Best = { e1rm: score, weight: set.weight ?? 0, reps: set.reps ?? 0, seconds: set.seconds ?? 0, date: s.startedAt, sessionId: s.id };
        if (!best || rank(cand) > rank(best)) best = cand;
      }
    }
  }
  return best;
}

// Weighted lifts rank by e1RM; reps-only by reps; timed holds by seconds.
const rank = (b: Best) => (b.e1rm > 0 ? b.e1rm * 1000 : b.reps > 0 ? b.reps : b.seconds);

export function personalBest(sessions: Session[], exerciseId: string) {
  return bestOf(sessions, exerciseId);
}

export type Record = { exerciseId: string; best: Best };

/** Best set for every exercise that has history, newest records first. */
export function allRecords(sessions: Session[]): Record[] {
  const ids = new Set(sessions.flatMap((s) => s.exercises.map((e) => e.exerciseId)));
  return [...ids]
    .map((id) => ({ exerciseId: id, best: bestOf(sessions, id)! }))
    .filter((r) => r.best)
    .sort((a, b) => b.best.date - a.best.date);
}

/** Exercises in `session` that beat every earlier session. */
export function sessionPRs(sessions: Session[], session: Session): Record[] {
  const out: Record[] = [];
  for (const e of session.exercises) {
    const now = bestOf([session], e.exerciseId);
    const before = bestOf(sessions, e.exerciseId, session.startedAt);
    if (now && (!before || rank(now) > rank(before))) out.push({ exerciseId: e.exerciseId, best: now });
  }
  return out;
}

/** Reps → heaviest weight lifted for that many reps. */
export function setRecords(sessions: Session[], exerciseId: string): { reps: number; weight: number }[] {
  const map = new Map<number, number>();
  for (const s of sessions)
    for (const e of s.exercises)
      if (e.exerciseId === exerciseId)
        for (const set of e.sets)
          if (set.done && set.weight && set.reps) map.set(set.reps, Math.max(map.get(set.reps) ?? 0, set.weight));
  return [...map.entries()].map(([reps, weight]) => ({ reps, weight })).sort((a, b) => a.reps - b.reps);
}

export type ExercisePoint = { t: number; e1rm: number; topWeight: number; volume: number; reps: number; seconds: number };

export function exerciseHistory(sessions: Session[], exerciseId: string): ExercisePoint[] {
  return sortedSessions(sessions)
    .reverse()
    .flatMap((s) => {
      const e = s.exercises.find((x) => x.exerciseId === exerciseId);
      if (!e) return [];
      const done = e.sets.filter((x) => x.done);
      if (!done.length) return [];
      return [
        {
          t: s.startedAt,
          e1rm: Math.max(...done.map((x) => e1rm(x.weight ?? 0, x.reps ?? 0))),
          topWeight: Math.max(...done.map((x) => x.weight ?? 0)),
          volume: exerciseVolume(e),
          reps: Math.max(...done.map((x) => x.reps ?? 0)),
          seconds: Math.max(...done.map((x) => x.seconds ?? 0)),
        },
      ];
    });
}

export function weeklyVolume(sessions: Session[], weeks: number, now = new Date()): { week: Date; volume: number }[] {
  const start = startOfWeek(now);
  return Array.from({ length: weeks }, (_, i) => {
    const week = addDays(start, -(weeks - 1 - i) * 7);
    const end = addDays(week, 7).getTime();
    const volume = sessions.filter((s) => s.startedAt >= week.getTime() && s.startedAt < end).reduce((n, s) => n + sessionVolume(s), 0);
    return { week, volume };
  });
}

/** Simple recovery model: a muscle is fully recovered 72 h after it was last trained. */
export function muscleRecovery(sessions: Session[], muscle: Muscle, now = Date.now()): number {
  let last = 0;
  for (const s of sessions)
    for (const e of s.exercises) {
      const ex = EXERCISE_BY_ID[e.exerciseId];
      if (!ex || !e.sets.some((x) => x.done)) continue;
      if (ex.muscle === muscle || ex.secondary.includes(muscle)) last = Math.max(last, s.endedAt);
    }
  if (!last) return 100;
  return Math.max(0, Math.min(100, Math.round(((now - last) / 3_600_000 / 72) * 100)));
}

export function routineMuscles(routine: Routine): Muscle[] {
  const counts = new Map<Muscle, number>();
  for (const item of routine.items) {
    const m = EXERCISE_BY_ID[item.exerciseId]?.muscle;
    if (m) counts.set(m, (counts.get(m) ?? 0) + item.sets);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([m]) => m);
}

export const routineSets = (r: Routine) => r.items.reduce((n, i) => n + i.sets, 0);

/** Rough duration: ~2.2 min per set incl. rest, rounded to 5 min. */
export const routineMinutes = (r: Routine) => Math.max(15, Math.round((routineSets(r) * 2.2) / 5) * 5);

export const getRoutine = (id?: string | null) => ROUTINES.find((r) => r.id === id);
export const getProgram = (id: string): Program => PROGRAMS.find((p) => p.id === id) ?? PROGRAMS[0];

export type DayStatus = 'done' | 'today' | 'planned' | 'missed' | 'rest';

export type PlanDay = {
  date: Date;
  key: string;
  routine?: Routine;
  session?: Session;
  status: DayStatus;
};

export function sessionsOn(sessions: Session[], key: string) {
  return sessions.filter((s) => dayKey(s.startedAt) === key);
}

export function planWeek(program: Program, sessions: Session[], now = new Date()): PlanDay[] {
  const todayKey = dayKey(now);
  const start = startOfWeek(now);
  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(start, i);
    const key = dayKey(date);
    const routine = getRoutine(program.schedule[weekdayIndex(date)]);
    const session = sessionsOn(sessions, key)[0];
    let status: DayStatus;
    if (session) status = 'done';
    else if (key === todayKey) status = routine ? 'today' : 'rest';
    else if (!routine) status = 'rest';
    else status = date < startOfDay(now) ? 'missed' : 'planned';
    return { date, key, routine, session, status };
  });
}

/** Consecutive weeks (ending this week, or last week if this one is still empty) with ≥ 1 workout. */
export function weekStreak(sessions: Session[], now = new Date()): number {
  const weeks = new Set(sessions.map((s) => dayKey(startOfWeek(new Date(s.startedAt)))));
  let cursor = startOfWeek(now);
  if (!weeks.has(dayKey(cursor))) cursor = addDays(cursor, -7);
  let n = 0;
  while (weeks.has(dayKey(cursor))) {
    n++;
    cursor = addDays(cursor, -7);
  }
  return n;
}

export type Nutrients = { kcal: number; protein: number; carbs: number; fat: number; fiber: number; sugar: number };

export const ZERO: Nutrients = { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0 };

export function entryNutrients(m: MealEntry): Nutrients {
  const f = FOOD_BY_ID[m.foodId];
  if (!f) return ZERO;
  const k = m.grams / 100;
  return { kcal: f.kcal * k, protein: f.protein * k, carbs: f.carbs * k, fat: f.fat * k, fiber: f.fiber * k, sugar: f.sugar * k };
}

export function sumNutrients(entries: MealEntry[]): Nutrients {
  return entries.reduce((acc, m) => {
    const n = entryNutrients(m);
    return {
      kcal: acc.kcal + n.kcal,
      protein: acc.protein + n.protein,
      carbs: acc.carbs + n.carbs,
      fat: acc.fat + n.fat,
      fiber: acc.fiber + n.fiber,
      sugar: acc.sugar + n.sugar,
    };
  }, ZERO);
}

export const mealsOn = (meals: MealEntry[], key: string) => meals.filter((m) => m.date === key).sort((a, b) => a.time.localeCompare(b.time));

export function latestWeighIn(w: WeighIn[]): WeighIn | undefined {
  return [...w].sort((a, b) => b.date.localeCompare(a.date))[0];
}

/** Change vs. the closest weigh-in at least `days` ago. */
export function weightChange(w: WeighIn[], days: number): number | undefined {
  const latest = latestWeighIn(w);
  if (!latest) return undefined;
  const cutoff = dayKey(addDays(fromKey(latest.date), -days));
  const past = [...w].filter((x) => x.date <= cutoff).sort((a, b) => b.date.localeCompare(a.date))[0];
  return past ? latest.kg - past.kg : undefined;
}
