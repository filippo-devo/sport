// Progress screen numbers: strength score, month calendar and achievements.
// Everything is computed from the user's own log; nothing is estimated from sample data.

import type { Measurement, Photo, Session, WeighIn } from '../data/types';
import { addDays, dayKey, fromKey, startOfWeek } from '../lib/date';
import { e1rm, sessionVolume } from './derived';
import { activeDays, goalWeekStreak, type ActivityLog } from './stats';

const DAY = 86400000;

/**
 * The four main lifts. Each lists the exercises that count for it, with the e1RM / body weight
 * ratio treated as 100 points (roughly an advanced lifter). The best variant per lift counts.
 */
export const STRENGTH_LIFTS = [
  { id: 'squat', variants: [['back-squat', 2.0], ['front-squat', 1.6]] },
  { id: 'bench', variants: [['barbell-bench-press', 1.5], ['close-grip-bench', 1.3], ['incline-barbell-bench', 1.25]] },
  { id: 'deadlift', variants: [['deadlift', 2.5], ['romanian-deadlift', 1.8]] },
  { id: 'press', variants: [['overhead-press', 1.0]] },
] as const satisfies readonly { id: string; variants: readonly (readonly [string, number])[] }[];

export type LiftId = (typeof STRENGTH_LIFTS)[number]['id'];

export type LiftScore = { id: LiftId; exerciseId: string; e1rm: number; ratio: number; score: number };

/** Best e1RM of an exercise in sessions that started before `before`. */
function bestE1rm(sessions: Session[], exerciseId: string, before: number) {
  let best = 0;
  for (const s of sessions) {
    if (s.startedAt >= before) continue;
    for (const e of s.exercises) {
      if (e.exerciseId !== exerciseId) continue;
      for (const set of e.sets) if (set.done && set.weight && set.reps) best = Math.max(best, e1rm(set.weight, set.reps));
    }
  }
  return best;
}

/** Weigh-in closest to (and not after) a date, else the earliest one. */
function weightAt(weighIns: WeighIn[], at: number) {
  if (weighIns.length === 0) return undefined;
  const key = dayKey(at);
  const sorted = [...weighIns].sort((a, b) => a.date.localeCompare(b.date));
  return [...sorted].reverse().find((w) => w.date <= key)?.kg ?? sorted[0].kg;
}

/**
 * Strength score 0–100: the average of the main lifts the user has done, each scored by
 * e1RM relative to body weight. Needs at least one weigh-in and one of the main lifts.
 */
export function strengthScore(sessions: Session[], weighIns: WeighIn[], at = Date.now()) {
  const bw = weightAt(weighIns, at);
  if (!bw) return { score: null, lifts: [] as LiftScore[], needsWeight: true };
  const lifts: LiftScore[] = [];
  for (const lift of STRENGTH_LIFTS) {
    let pick: LiftScore | undefined;
    for (const [exerciseId, standard] of lift.variants) {
      const best = bestE1rm(sessions, exerciseId, at);
      if (best <= 0) continue;
      const ratio = best / bw;
      const score = Math.min(100, (ratio / standard) * 100);
      if (!pick || score > pick.score) pick = { id: lift.id, exerciseId, e1rm: best, ratio, score };
    }
    if (pick) lifts.push(pick);
  }
  const score = lifts.length ? Math.round(lifts.reduce((n, l) => n + l.score, 0) / lifts.length) : null;
  return { score, lifts, needsWeight: false };
}

export type MonthDay = { key: string; date: Date; day: number; workouts: number; volume: number; active: boolean; future: boolean; today: boolean };

/** Weeks (Monday first) of the month containing `month`; days outside the month are null. */
export function monthCalendar(log: ActivityLog, month: Date, now = new Date()): (MonthDay | null)[][] {
  const active = activeDays(log);
  const byDay = new Map<string, Session[]>();
  for (const s of log.sessions) {
    const k = dayKey(s.startedAt);
    byDay.set(k, [...(byDay.get(k) ?? []), s]);
  }
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const today = dayKey(now);
  const cells: (MonthDay | null)[] = Array.from({ length: (first.getDay() + 6) % 7 }, () => null);
  for (let d = 1; d <= days; d++) {
    const date = new Date(month.getFullYear(), month.getMonth(), d);
    const key = dayKey(date);
    const list = byDay.get(key) ?? [];
    cells.push({ key, date, day: d, workouts: list.length, volume: list.reduce((n, s) => n + sessionVolume(s), 0), active: active.has(key), future: key > today, today: key === today });
  }
  while (cells.length % 7) cells.push(null);
  return Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7));
}

/** Longest run of consecutive active days in the whole log. */
export function bestDayStreak(days: Set<string>) {
  const keys = [...days].sort();
  let best = 0;
  let run = 0;
  let prev: string | undefined;
  for (const k of keys) {
    run = prev && dayKey(addDays(fromKey(prev), 1)) === k ? run + 1 : 1;
    best = Math.max(best, run);
    prev = k;
  }
  return best;
}

export type AchievementIcon = 'barbell' | 'fire' | 'calendar' | 'trophy' | 'lightning' | 'camera' | 'scales';

export type Achievement = { id: string; icon: AchievementIcon; value: number; target: number; unlocked: boolean };

export type AchievementInput = ActivityLog & { weighIns: WeighIn[]; photos: Photo[]; measurements: Measurement[]; workoutsPerWeek: number };

/** Badges earned from the log. `value / target` is the progress towards each one. */
export function achievements(input: AchievementInput, now = new Date()): Achievement[] {
  const { sessions } = input;
  const total = sessions.length;
  const volume = sessions.reduce((n, s) => n + sessionVolume(s), 0);
  const weekStreak = goalWeekStreak(sessions, input.workoutsPerWeek, now).best;
  const dayStreak = bestDayStreak(activeDays(input));
  const bw = weightAt(input.weighIns, now.getTime());
  const ratio = (id: string) => (bw ? bestE1rm(sessions, id, Infinity) / bw : 0);
  const earlyBird = sessions.filter((s) => new Date(s.startedAt).getHours() < 8).length;
  const weeksActive = new Set(sessions.map((s) => dayKey(startOfWeek(new Date(s.startedAt))))).size;

  const list: Omit<Achievement, 'unlocked'>[] = [
    { id: 'firstWorkout', icon: 'barbell', value: total, target: 1 },
    { id: 'workouts10', icon: 'barbell', value: total, target: 10 },
    { id: 'workouts50', icon: 'barbell', value: total, target: 50 },
    { id: 'workouts100', icon: 'barbell', value: total, target: 100 },
    { id: 'weekStreak4', icon: 'fire', value: weekStreak, target: 4 },
    { id: 'weekStreak12', icon: 'fire', value: weekStreak, target: 12 },
    { id: 'dayStreak7', icon: 'calendar', value: dayStreak, target: 7 },
    { id: 'dayStreak30', icon: 'calendar', value: dayStreak, target: 30 },
    { id: 'weeks10', icon: 'calendar', value: weeksActive, target: 10 },
    { id: 'volume10t', icon: 'lightning', value: Math.round(volume), target: 10000 },
    { id: 'volume100t', icon: 'lightning', value: Math.round(volume), target: 100000 },
    { id: 'benchBw', icon: 'trophy', value: Math.round(ratio('barbell-bench-press') * 100), target: 100 },
    { id: 'squat15', icon: 'trophy', value: Math.round(ratio('back-squat') * 100), target: 150 },
    { id: 'deadlift2', icon: 'trophy', value: Math.round(ratio('deadlift') * 100), target: 200 },
    { id: 'earlyBird', icon: 'fire', value: earlyBird, target: 5 },
    { id: 'firstPhoto', icon: 'camera', value: input.photos.length, target: 1 },
    { id: 'firstMeasure', icon: 'scales', value: input.measurements.length + input.weighIns.length, target: 1 },
  ];
  return list.map((a) => ({ ...a, value: Math.min(a.value, a.target), unlocked: a.value >= a.target }));
}

/** Timestamp `days` before now. */
export const daysAgo = (days: number, now = Date.now()) => now - days * DAY;
