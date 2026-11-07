// Turns a spoken set into values, e.g.
//   "Zrobiłem 10 powtórzeń z 60 kg"          → 1 set × 10 reps @ 60 kg
//   "Trzy serie po dwanaście z dwudziestoma kilo" → 3 sets × 12 reps @ 20 kg
//   "8 razy 62 i pół"                         → 1 set × 8 reps @ 62.5
//   "Plank 45 sekund" / "minuta"              → 45 s / 60 s
//   "12 powtórzeń"                            → reps only, weight from the previous set
// Purely rule-based: no AI and no network.

import { fold, readNumber } from './voiceNutrition';

export type SpokenSets = {
  sets: number;
  reps?: number;
  weight?: number;
  /** "lb" when the weight was said in pounds; otherwise the unit wasn't said or was kg. */
  weightUnit?: 'kg' | 'lb';
  seconds?: number;
};

type Kind = 'reps' | 'weight' | 'sets' | 'seconds' | 'minutes';

const LABEL: { test: RegExp; kind: Kind; lb?: boolean }[] = [
  { test: /^(kg|kilo\w*|kilogram\w*|kil|kile)$/, kind: 'weight' },
  { test: /^(lb|lbs|funt\w*|pound\w*)$/, kind: 'weight', lb: true },
  { test: /^(powt\w*|razy|raz|rep|reps|repy|repow|repetition\w*|times|x)$/, kind: 'reps' },
  { test: /^(seri\w*|set|sets|sety|setow|serie)$/, kind: 'sets' },
  { test: /^(s|sek|sekund\w*|sec|secs|second\w*)$/, kind: 'seconds' },
  { test: /^(min|minut\w*|minute\w*)$/, kind: 'minutes' },
];

const labelOf = (t: string | undefined) => (t ? LABEL.find((l) => l.test.test(t)) : undefined);
const HALF = /^(pol|half)$/;

export function parseSetSpeech(input: string): SpokenSets | null {
  const tokens = fold(input)
    .replace(/(\d)\s*(kg|lb|lbs|x|s)\b/g, '$1 $2')
    .replace(/(\d)x(\d)/g, '$1 x $2')
    .split(/[^a-z0-9.,]+/)
    .map((t) => t.replace(/[.,]+$/, ''))
    .filter(Boolean);

  const out: SpokenSets = { sets: 1 };
  let setsSaid = false;
  const loose: { value: number; before?: string }[] = [];

  for (let i = 0; i < tokens.length; i++) {
    // "minuta", "pół minuty" with no number.
    const bare = labelOf(tokens[i]);
    if (bare?.kind === 'minutes' && readNumber(tokens, i - 1) == null) {
      out.seconds = HALF.test(tokens[i - 1] ?? '') ? 30 : 60;
      continue;
    }
    const num = readNumber(tokens, i);
    if (!num) continue;
    let value = num.value;
    let j = num.next + 1;
    // "62 i pół", "62,5" (already a number), "sześćdziesiąt dwa i pół".
    if (tokens[j] === 'i' && HALF.test(tokens[j + 1] ?? '')) {
      value += 0.5;
      j += 2;
    }
    // "3x10" / "3 x 10": sets × reps.
    if (tokens[j] === 'x' && readNumber(tokens, j + 1)) {
      out.sets = Math.round(value);
      setsSaid = true;
      i = j;
      continue;
    }
    const label = labelOf(tokens[j]);
    const before = tokens[i - 1];
    i = j - 1;
    if (!label) {
      loose.push({ value, before });
      continue;
    }
    i = j;
    if (label.kind === 'weight') {
      out.weight = value;
      out.weightUnit = label.lb ? 'lb' : 'kg';
    } else if (label.kind === 'reps') out.reps = Math.round(value);
    else if (label.kind === 'sets') {
      out.sets = Math.round(value);
      setsSaid = true;
    } else if (label.kind === 'seconds') out.seconds = Math.round(value);
    else out.seconds = Math.round(value * 60);
  }

  // Numbers without a unit: "po 10" → reps, "z 60" → weight, otherwise reps first, then weight.
  for (const n of loose) {
    if ((n.before === 'z' || n.before === 'ze' || n.before === 'with' || n.before?.startsWith('obciazen')) && out.weight == null)
      out.weight = n.value;
    else if (n.before === 'po' && out.reps == null) out.reps = Math.round(n.value);
    else if (out.reps == null) out.reps = Math.round(n.value);
    else if (out.weight == null) out.weight = n.value;
    else if (!setsSaid) {
      // "3 10 60" → sets, reps, weight
      out.sets = out.reps;
      out.reps = Math.round(out.weight);
      out.weight = n.value;
      setsSaid = true;
    }
  }

  const ok = (v: number | undefined, max: number) => v == null || (v >= 0 && v <= max);
  if (out.reps == null && out.weight == null && out.seconds == null) return null;
  if (!ok(out.reps, 200) || !ok(out.weight, 600) || !ok(out.seconds, 3600)) return null;
  out.sets = Math.min(Math.max(out.sets, 1), 10);
  return out;
}
