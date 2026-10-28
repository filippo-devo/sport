import { useMemo } from 'react';

import type { Lang, Localized } from '../data/types';
import { useStore } from '../store';
import { en, type Dict } from './en';
import { pl } from './pl';

export type TKey = keyof Dict;

const DICTS: Record<Lang, Dict> = { en, pl };

/** Plural form index. en: one | other; pl: one | few | many. */
function pluralIndex(lang: Lang, n: number): number {
  const a = Math.abs(n);
  if (lang === 'en') return a === 1 ? 0 : 1;
  if (a === 1) return 0;
  const d = a % 10;
  const dd = a % 100;
  return d >= 2 && d <= 4 && !(dd >= 12 && dd <= 14) ? 1 : 2;
}

function interpolate(s: string, params?: Record<string, string | number>) {
  return params ? s.replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? '')) : s;
}

export function makeT(lang: Lang) {
  const dict = DICTS[lang];
  const t = (key: TKey, params?: Record<string, string | number>) => interpolate(dict[key], params);
  /** Plural keys hold forms separated by "|"; `{n}` is replaced with the count. */
  const tn = (key: TKey, n: number, params?: Record<string, string | number>) => {
    const forms = dict[key].split('|');
    return interpolate(forms[Math.min(pluralIndex(lang, n), forms.length - 1)], { n, ...params });
  };
  const L = (x: Localized) => x[lang];
  const weekdayShort = (d: Date) => dict['date.weekdaysShort'].split(',')[(d.getDay() + 6) % 7];
  const weekdayLong = (d: Date) => dict['date.weekdaysLong'].split(',')[(d.getDay() + 6) % 7];
  const month = (d: Date) => dict['date.months'].split(',')[d.getMonth()];
  const monthShort = (d: Date) => dict['date.monthsShort'].split(',')[d.getMonth()];
  /** Nominative month name for headings ("październik 2026"). */
  const monthYear = (d: Date) => `${dict['date.monthsStandalone'].split(',')[d.getMonth()]} ${d.getFullYear()}`;
  /** "Wednesday, 28 October" / "środa, 28 października" */
  const dateLong = (d: Date) => `${weekdayLong(d)}, ${d.getDate()} ${month(d)}`;
  /** "28 Oct" */
  const dateShort = (d: Date) => `${d.getDate()} ${monthShort(d)}`;
  return { lang, t, tn, L, weekdayShort, weekdayLong, month, monthShort, monthYear, dateLong, dateShort };
}

export type Translator = ReturnType<typeof makeT>;

export function useT(): Translator {
  const lang = useStore((s) => s.settings.lang);
  return useMemo(() => makeT(lang), [lang]);
}
