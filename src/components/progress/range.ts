import type { Session } from '../../data/types';
import { addDays, startOfDay, startOfWeek } from '../../lib/date';
import { sessionVolume } from '../../store/derived';

export type Range = 'week' | 'month' | '3m' | 'year';
export type Metric = 'workouts' | 'volume' | 'minutes';

/** Start of the selected range (inclusive). */
export function rangeStart(range: Range, now = new Date()): Date {
  if (range === 'week') return startOfWeek(now);
  if (range === 'month') return addDays(startOfDay(now), -30);
  if (range === '3m') return addDays(startOfDay(now), -91);
  return addDays(startOfDay(now), -365);
}

export type Bucket = { start: Date; end: Date; kind: 'day' | 'week' | 'month' };

/** Chart buckets for a range: days of this week, weeks for 1–3 months, months for a year. */
export function rangeBuckets(range: Range, now = new Date()): Bucket[] {
  if (range === 'week') {
    const w = startOfWeek(now);
    return Array.from({ length: 7 }, (_, i) => ({ start: addDays(w, i), end: addDays(w, i + 1), kind: 'day' as const }));
  }
  if (range === 'year') {
    return Array.from({ length: 12 }, (_, i) => {
      const start = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
      return { start, end: new Date(start.getFullYear(), start.getMonth() + 1, 1), kind: 'month' as const };
    });
  }
  const weeks = range === 'month' ? 5 : 13;
  const w = startOfWeek(now);
  return Array.from({ length: weeks }, (_, i) => {
    const start = addDays(w, -(weeks - 1 - i) * 7);
    return { start, end: addDays(start, 7), kind: 'week' as const };
  });
}

export function metricOf(sessions: Session[], metric: Metric, from: number, to: number): number {
  const list = sessions.filter((s) => s.startedAt >= from && s.startedAt < to);
  if (metric === 'workouts') return list.length;
  if (metric === 'volume') return list.reduce((n, s) => n + sessionVolume(s), 0);
  return Math.round(list.reduce((n, s) => n + Math.max(0, s.endedAt - s.startedAt), 0) / 60000);
}
