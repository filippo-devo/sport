import { useCallback } from 'react';

import { useT } from '../../i18n';
import { addDays, dayKey, fromKey } from '../../lib/date';
import { formatNumber } from '../../lib/units';
import { parseMealSpeech } from '../../lib/voiceMeal';
import { kcalFromMacros } from '../../lib/voiceNutrition';
import { useStore } from '../../store';
import { useUi } from '../../store/ui';
import type { VoiceOutcome } from './VoiceSheet';

/** "Na obiad jadłem kurczaka z ryżem" → saved to today's lunch at once (or the day open on the Food tab). */
export function useSpokenMeal() {
  const { t, L } = useT();
  return useCallback(
    (text: string): VoiceOutcome => {
      const r = parseMealSpeech(text);
      const st = useStore.getState();
      const open = useUi.getState().foodDate;
      const date = r.daysAgo ? dayKey(addDays(new Date(), -r.daysAgo)) : open;
      const before = new Set(st.meals.map((m) => m.id));
      const lines: string[] = [];
      let kcal = 0;

      for (const f of r.foods) {
        st.addFood({ foodId: f.food.id, grams: f.grams, meal: r.meal, date });
        const k = (f.food.kcal * f.grams) / 100;
        kcal += k;
        lines.push(`${L(f.food.name)} · ${f.grams} g · ${Math.round(k)} kcal`);
      }
      if (r.macros) {
        const m = r.macros;
        const k = m.kcal ?? kcalFromMacros(m.protein, m.carbs, m.fat);
        st.addManual({
          manual: { name: t('addMeal.voiceName'), kcal: k, protein: m.protein ?? 0, carbs: m.carbs ?? 0, fat: m.fat ?? 0 },
          meal: r.meal,
          date,
        });
        kcal += k;
        lines.push(
          [`${k} kcal`, m.protein != null && `${t('macro.p')} ${formatNumber(m.protein, 0)} g`, m.carbs != null && `${t('macro.c')} ${formatNumber(m.carbs, 0)} g`, m.fat != null && `${t('macro.f')} ${formatNumber(m.fat, 0)} g`]
            .filter(Boolean)
            .join(' · '),
        );
      }

      const added = useStore.getState().meals.filter((m) => !before.has(m.id)).map((m) => m.id);
      if (!added.length) return { ok: false, title: t('voice.mealNotUnderstood'), lines: [t('voice.mealNotUnderstoodBody')] };

      const day = date === dayKey() ? t('voice.today') : date === dayKey(addDays(new Date(), -1)) ? t('voice.yesterday') : fromKey(date).toLocaleDateString();
      if (lines.length > 1) lines.push(t('voice.total', { kcal: Math.round(kcal) }));
      return {
        ok: true,
        title: t('voice.mealSaved', { meal: t(`meal.${r.meal}`), day }),
        lines,
        undo: () => added.forEach((id) => useStore.getState().deleteMeal(id)),
      };
    },
    [t, L],
  );
}
