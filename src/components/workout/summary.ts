import type { Exercise, SessionExercise, SetEntry, Units } from '../../data/types';
import type { Translator } from '../../i18n';
import { formatWeight } from '../../lib/units';

/** Index of the first set not ticked off, or -1 when the exercise is complete. */
export const nextSetIndex = (e: SessionExercise) => e.sets.findIndex((s) => !s.done);

export const isComplete = (e: SessionExercise) => e.sets.length > 0 && e.sets.every((s) => s.done);

/** Weights to show for an exercise: entered values, else last time, else the plan. */
function weights(e: SessionExercise, previous?: SessionExercise): number[] {
  const own = e.sets.map((s) => s.weight).filter((w): w is number => !!w);
  if (own.length) return own;
  const prev = (previous?.sets ?? []).map((s) => s.weight).filter((w): w is number => !!w);
  if (prev.length) return prev;
  return e.weight ? [e.weight] : [];
}

/** "4 serie · 10–8 powt. · 18→20 kg" line under an exercise name. */
export function exerciseSummary(t: Translator, ex: Exercise, e: SessionExercise, units: Units, previous?: SessionExercise): string {
  const parts = [t.tn('unit.sets', e.sets.length)];
  if (e.target) parts.push(ex.tracking === 'time' ? t.t('unit.secRange', { r: e.target }) : t.t('unit.repsRange', { r: e.target }));
  if (ex.tracking === 'weightReps') {
    const w = weights(e, previous);
    if (w.length) {
      const lo = Math.min(...w);
      const hi = Math.max(...w);
      parts.push(lo === hi ? formatWeight(lo, units) : `${formatWeight(lo, units, false)}→${formatWeight(hi, units)}`);
    }
  }
  return parts.join(' · ');
}

/** Compact "18 kg × 10" text for one set. */
export function setText(ex: Exercise, s: SetEntry | undefined, units: Units): string | null {
  if (!s) return null;
  if (ex.tracking === 'time') return s.seconds ? `${s.seconds} s` : null;
  if (ex.tracking === 'reps') return s.reps ? `× ${s.reps}` : null;
  return s.weight && s.reps ? `${formatWeight(s.weight, units)} × ${s.reps}` : null;
}
