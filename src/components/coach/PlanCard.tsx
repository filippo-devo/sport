import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { PlanProposal } from '../../ai/types';
import { EXERCISE_BY_ID } from '../../data/exercises';
import { useT } from '../../i18n';
import { formatWeight } from '../../lib/units';
import { useStore } from '../../store';
import { colors, fonts, radius, space, type } from '../../theme/tokens';
import { CaretDownIcon, CheckCircleIcon } from '../icons';
import { Button } from '../ui/controls';

const MONDAY = new Date(2024, 0, 1); // a Monday, for weekday names

/** A proposed weekly plan with its days; saving turns it into one of the user's plans. */
export function PlanCard({ plan, savedId, onSave }: { plan: PlanProposal; savedId?: string; onSave: (activate: boolean) => void }) {
  const { t, tn, L, weekdayShort } = useT();
  const units = useStore((s) => s.settings.units);
  const savedExists = useStore((s) => !!savedId && s.programs.some((p) => p.id === savedId));
  const [open, setOpen] = useState<number | null>(null);

  return (
    <View style={styles.card}>
      <Text style={styles.kicker}>{plan.replacesPlanId ? t('coach.planUpdated') : t('coach.planProposed')}</Text>
      <Text style={styles.name}>{plan.name}</Text>
      {plan.description ? <Text style={styles.meta}>{plan.description}</Text> : null}
      <View style={styles.days}>
        {plan.days.map((d) => {
          const date = new Date(MONDAY);
          date.setDate(MONDAY.getDate() + d.weekday);
          const expanded = open === d.weekday;
          return (
            <View key={d.weekday} style={styles.day}>
              <Pressable style={styles.dayHead} onPress={() => setOpen(expanded ? null : d.weekday)} accessibilityRole="button">
                <Text style={styles.weekday}>{weekdayShort(date)}</Text>
                <Text style={styles.dayName} numberOfLines={1}>
                  {d.name}
                </Text>
                <Text style={styles.meta}>{tn('unit.exercises', d.items.length)}</Text>
                <CaretDownIcon size={12} color={colors.textSecondary} weight="bold" style={expanded ? { transform: [{ rotate: '180deg' }] } : undefined} />
              </Pressable>
              {expanded &&
                d.items.map((i, idx) => {
                  const ex = EXERCISE_BY_ID[i.exerciseId];
                  return (
                    <Text key={`${i.exerciseId}-${idx}`} style={styles.item} numberOfLines={1}>
                      {ex ? L(ex.name) : i.exerciseId} · {i.sets} × {ex?.tracking === 'time' ? `${i.target} s` : i.target}
                      {i.weightKg ? ` · ${formatWeight(i.weightKg, units)}` : ''}
                    </Text>
                  );
                })}
            </View>
          );
        })}
      </View>
      {savedId && savedExists ? (
        <Pressable style={styles.saved} onPress={() => router.push(`/plans/${savedId}`)} accessibilityRole="button">
          <CheckCircleIcon size={18} color={colors.success} weight="fill" />
          <Text style={styles.savedText}>{t('coach.saved')}</Text>
          <Text style={[styles.savedText, { color: colors.accent }]}>{t('coach.openPlan')}</Text>
        </Pressable>
      ) : (
        <View style={styles.actions}>
          <Button label={t('coach.saveActivate')} size="sm" onPress={() => onSave(true)} style={{ flex: 1 }} />
          <Button label={t('common.save')} size="sm" variant="secondary" onPress={() => onSave(false)} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.lg, gap: space.xs, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.cardStroke },
  kicker: { ...type.caption, color: colors.accent, fontFamily: fonts.semibold },
  name: { fontFamily: fonts.bold, fontSize: 18, color: colors.textPrimary },
  meta: { ...type.caption, color: colors.textSecondary },
  days: { marginTop: space.sm, gap: 2 },
  day: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.hairline, paddingVertical: space.sm },
  dayHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  weekday: { fontFamily: fonts.semibold, fontSize: 13, color: colors.textSecondary, width: 30, textTransform: 'capitalize' },
  dayName: { ...type.body, color: colors.textPrimary, flex: 1 },
  item: { ...type.caption, color: colors.textSecondary, marginLeft: 38, marginTop: 4 },
  actions: { flexDirection: 'row', gap: space.sm, marginTop: space.sm },
  saved: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.sm },
  savedText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.textPrimary },
});
