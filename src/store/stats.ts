// Training statistics computed only from what the user actually logged (sessions, meals, water,
// supplements). No sample or random data: an empty log gives zeros and empty charts.

import type { Goals, MealEntry, Session, SupplementLog, WaterEntry } from '../data/types';
import { addDays, dayKey, fromKey, startOfDay, startOfWeek } from '../lib/date';
import { sessionVolume } from './derived';

const DAY = 86400000;

const inRange = (sessions: Session[], from: number, to: number) => sessions.filter((s) => s.startedAt >= from && s.startedAt < to);

export const startOfMonth = (d = new Date()) => new Date(d.getFullYear(), d.getMonth(), 1);

/** Workouts, minutes and volume between two timestamps. */
export function periodTotals(sessions: Session[], from: number, to: number) {
  const list = inRange(sessions, from, to);
  return {
    workouts: list.length,
    minutes: Math.round(list.reduce((n, s) => n + Math.max(0, s.endedAt - s.startedAt), 0) / 60000),
    volume: list.reduce((n, s) => n + sessionVolume(s), 0),
    days: new Set(list.map((s) => dayKey(s.startedAt))).size,
  };
}

export type GoalProgress = { done: number; goal: number; ratio: number };

const progress = (done: number, goal: number): GoalProgress => ({ done, goal, ratio: goal > 0 ? Math.min(1, done / goal) : 0 });

/** This week's and this month's workouts against the goals from the profile. */
export function goalProgress(sessions: Session[], goals: Goals, now = new Date()) {
  const week = startOfWeek(now).getTime();
  const month = startOfMonth(now).getTime();
  const end = now.getTime() + DAY;
  return {
    week: progress(inRange(sessions, week, end).length, goals.workoutsPerWeek),
    month: progress(inRange(sessions, month, end).length, goals.workoutsPerMonth),
  };
}

/** Workouts per calendar week, oldest first (current week last). */
export function workoutsPerWeek(sessions: Session[], weeks: number, now = new Date()) {
  const start = startOfWeek(now);
  return Array.from({ length: weeks }, (_, i) => {
    const week = addDays(start, -(weeks - 1 - i) * 7);
    return { week, count: inRange(sessions, week.getTime(), addDays(week, 7).getTime()).length };
  });
}

/**
 * Regularity: how well the weekly goal was kept over the last `weeks` finished weeks.
 * Each week counts min(workouts, goal) / goal, so an extra workout can't hide a skipped week.
 * The current week is included only once it has met the goal (it isn't over yet).
 */
export function regularity(sessions: Session[], goalPerWeek: number, weeks = 4, now = new Date()): number | null {
  if (goalPerWeek <= 0 || sessions.length === 0) return null;
  const series = workoutsPerWeek(sessions, weeks + 1, now);
  const current = series[series.length - 1];
  const first = Math.min(...sessions.map((s) => s.startedAt));
  // Ignore weeks before the first logged workout so a new user isn't penalised.
  const counted = series.slice(0, -1).filter((w) => addDays(w.week, 7).getTime() > first);
  if (current.count >= goalPerWeek) counted.push(current);
  if (counted.length === 0) return current.count > 0 ? Math.min(1, current.count / goalPerWeek) : null;
  return counted.reduce((n, w) => n + Math.min(w.count, goalPerWeek) / goalPerWeek, 0) / counted.length;
}

/**
 * Consecutive weeks that met the weekly workout goal. The current week extends the streak
 * once it reaches the goal; until then the streak counts up to last week.
 */
export function goalWeekStreak(sessions: Session[], goalPerWeek: number, now = new Date()) {
  const counts = new Map<string, number>();
  for (const s of sessions) {
    const k = dayKey(startOfWeek(new Date(s.startedAt)));
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  const met = (d: Date) => (counts.get(dayKey(d)) ?? 0) >= Math.max(1, goalPerWeek);
  let cursor = startOfWeek(now);
  if (!met(cursor)) cursor = addDays(cursor, -7);
  let current = 0;
  while (met(cursor)) {
    current++;
    cursor = addDays(cursor, -7);
  }
  // Best streak over the whole log.
  const keys = [...counts.keys()].sort();
  let best = 0;
  if (keys.length) {
    let run = 0;
    for (let w = startOfWeek(fromKey(keys[0])); w <= now; w = addDays(w, 7)) {
      run = met(w) ? run + 1 : 0;
      best = Math.max(best, run);
    }
  }
  return { current, best: Math.max(best, current) };
}

export type ActivityLog = { sessions: Session[]; meals: MealEntry[]; water: WaterEntry[]; supplementLogs: SupplementLog[] };

/** Every day with anything logged: a workout, a meal, water or a supplement. */
export function activeDays(log: ActivityLog): Set<string> {
  const days = new Set<string>();
  for (const s of log.sessions) days.add(dayKey(s.startedAt));
  for (const m of log.meals) days.add(m.date);
  for (const w of log.water) days.add(w.date);
  for (const l of log.supplementLogs) days.add(l.date);
  return days;
}

/** Consecutive active days ending today (or yesterday, if today has nothing yet). */
export function dayStreak(days: Set<string>, now = new Date()) {
  let cursor = startOfDay(now);
  if (!days.has(dayKey(cursor))) cursor = addDays(cursor, -1);
  let n = 0;
  while (days.has(dayKey(cursor))) {
    n++;
    cursor = addDays(cursor, -1);
  }
  return n;
}

export type CalendarDay = { key: string; date: Date; workouts: number; volume: number; active: boolean; future: boolean };

/** `weeks` full weeks ending with the current one, Monday first, for the activity calendar. */
export function activityCalendar(log: ActivityLog, weeks: number, now = new Date()): CalendarDay[][] {
  const active = activeDays(log);
  const byDay = new Map<string, Session[]>();
  for (const s of log.sessions) {
    const k = dayKey(s.startedAt);
    byDay.set(k, [...(byDay.get(k) ?? []), s]);
  }
  const today = dayKey(now);
  const first = addDays(startOfWeek(now), -(weeks - 1) * 7);
  return Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const date = addDays(first, w * 7 + d);
      const key = dayKey(date);
      const list = byDay.get(key) ?? [];
      return { key, date, workouts: list.length, volume: list.reduce((n, s) => n + sessionVolume(s), 0), active: active.has(key), future: key > today };
    }),
  );
}

/** Workouts per weekday (Mon..Sun) over the whole log: shows when the user actually trains. */
export function weekdayHistogram(sessions: Session[]) {
  const out = [0, 0, 0, 0, 0, 0, 0];
  for (const s of sessions) out[(new Date(s.startedAt).getDay() + 6) % 7]++;
  return out;
}
