import type { Translator } from '../../i18n';
import { fromDisplayWeight } from '../../lib/units';
import { parseSetSpeech } from '../../lib/voiceSets';
import { EXERCISE_BY_ID } from '../../data/exercises';
import { useStore } from '../../store';
import { nextSetIndex, setText } from '../workout/summary';
import type { VoiceOutcome } from './VoiceSheet';

/**
 * "Zrobiłem 10 powtórzeń z 60 kg" / "3 serie po 10 z 40": fills the next open sets of exercise `ex`
 * in the live workout and ticks them off (rest timer starts as with the Log set button).
 */
export function logSpokenSets(tr: Translator, ex: number, text: string): VoiceOutcome {
  const { t } = tr;
  const st = useStore.getState();
  const entry = st.active?.exercises[ex];
  const exercise = entry && EXERCISE_BY_ID[entry.exerciseId];
  if (!entry || !exercise) return { ok: false, title: t('voice.setsNotUnderstood'), lines: [] };
  const units = st.settings.units;
  const said = parseSetSpeech(text);
  const tracking = exercise.tracking;
  const usable = said && (tracking === 'time' ? said.seconds != null : said.reps != null || (tracking === 'weightReps' && said.weight != null));
  if (!said || !usable)
    return { ok: false, title: t('voice.setsNotUnderstood'), lines: [tracking === 'time' ? t('voice.timeExample') : t('voice.setsExample1')] };

  const weight =
    said.weight == null ? undefined : said.weightUnit === 'lb' ? fromDisplayWeight(said.weight, 'lb') : said.weightUnit === 'kg' ? said.weight : fromDisplayWeight(said.weight, units);
  const snapshot = entry.sets.map((s) => ({ ...s }));
  const logged: number[] = [];

  for (let n = 0; n < said.sets; n++) {
    const cur = useStore.getState().active!.exercises[ex];
    let i = nextSetIndex(cur);
    if (i < 0) {
      useStore.getState().addSet(ex);
      i = cur.sets.length;
    }
    const patch =
      tracking === 'time'
        ? { seconds: said.seconds }
        : tracking === 'reps'
          ? { reps: said.reps }
          : { ...(said.reps != null && { reps: said.reps }), ...(weight != null && { weight }) };
    useStore.getState().updateSet(ex, i, patch);
    useStore.getState().toggleSet(ex, i);
    logged.push(i);
  }

  const after = useStore.getState().active!.exercises[ex];
  const lines = logged.map((i) => t('voice.setLine', { n: i + 1, v: setText(exercise, after.sets[i], units) ?? '' }));
  return {
    ok: true,
    title: tr.tn('voice.setsSaved', logged.length),
    lines,
    undo: () => {
      const s = useStore.getState();
      // Sets added by the voice command go away; existing ones get their old values back.
      [...logged].sort((a, b) => b - a).forEach((i) => {
        if (i >= snapshot.length) s.removeSet(ex, i);
        else s.updateSet(ex, i, { weight: snapshot[i].weight, reps: snapshot[i].reps, seconds: snapshot[i].seconds, done: snapshot[i].done });
      });
      s.skipRest();
    },
  };
}
