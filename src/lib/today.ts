// Pure helpers for the Today screen: the user's layout, the "unlock your phone" schedule
// and when the next progress photo is due.

import type { Photo, TodayCard, TodayLayout, UnlockChallenge, UnlockLog } from '../data/types';
import { DEFAULT_TODAY_LAYOUT } from '../store';
import { dayKey, hhmm } from './date';

export const MAX_WIDGETS = 3;

/** Saved layouts from older versions may miss cards added later: append those, drop unknown ones. */
export function normalizeLayout(layout: TodayLayout | undefined): TodayLayout {
  if (!layout) return DEFAULT_TODAY_LAYOUT;
  const known = new Set<TodayCard>(DEFAULT_TODAY_LAYOUT.cards.map((c) => c.id));
  const cards = layout.cards.filter((c) => known.has(c.id));
  for (const c of DEFAULT_TODAY_LAYOUT.cards) if (!cards.some((x) => x.id === c.id)) cards.push(c);
  return { widgets: layout.widgets.slice(0, MAX_WIDGETS), cards };
}

export type UnlockSlot = { time: string; done: boolean; due: boolean };

/**
 * Today's slots. A slot counts as done when a set was logged at or after its time and
 * before the next slot; it is due once its time has passed and it isn't done.
 */
export function unlockSlots(u: UnlockChallenge, logs: UnlockLog[], now = new Date()): UnlockSlot[] {
  const today = dayKey(now);
  const times = [...u.times].sort();
  const done = logs.filter((l) => l.date === today).map((l) => l.time);
  const nowTime = hhmm(now);
  return times.map((time, i) => {
    const next = times[i + 1] ?? '24:00';
    const isDone = done.some((d) => d >= time && d < next);
    return { time, done: isDone, due: !isDone && nowTime >= time };
  });
}

const DAY = 86_400_000;

/** Days until the next photo (0 or less = due now). No photo yet is due now. */
export function photoDueIn(photos: Photo[], everyDays: number, now = new Date()): number {
  if (!photos.length) return 0;
  const last = photos.reduce((a, b) => (a.date > b.date ? a : b));
  const [y, m, d] = last.date.split('-').map(Number);
  const lastDay = new Date(y, m - 1, d).getTime();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return everyDays - Math.round((today - lastDay) / DAY);
}
