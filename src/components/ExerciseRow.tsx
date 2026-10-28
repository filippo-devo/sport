import { Pressable, StyleSheet, Text, View } from 'react-native';

import { EXERCISE_BY_ID } from '../data/exercises';
import type { RoutineItem, Units } from '../data/types';
import { useT } from '../i18n';
import { formatWeight } from '../lib/units';
import { colors, fonts, radius, space, type } from '../theme/tokens';
import { SetBars } from './SetBars';

type Props = {
  item: Pick<RoutineItem, 'exerciseId' | 'sets' | 'target'>;
  index: number;
  /** Last working weight in kg, shown after reps. */
  weight?: number;
  units: Units;
  onPress?: () => void;
};

// Mirrors Gravl's exercise row: square media tile, name, then
// "III 3 sets · 10–8 reps · 12 kg" in the secondary tone.
export function ExerciseRow({ item, index, weight, units, onPress }: Props) {
  const { t, tn, L } = useT();
  const e = EXERCISE_BY_ID[item.exerciseId];
  if (!e) return null;
  const reps = e.tracking === 'time' ? t('unit.secRange', { r: item.target }) : t('unit.repsRange', { r: item.target });
  const meta = [tn('unit.sets', item.sets), reps, weight ? formatWeight(weight, units) : undefined].filter(Boolean).join(' · ');

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${index + 1}. ${L(e.name)}, ${meta}`}
    >
      <View style={styles.tile}>
        <Text style={styles.index}>{String(index + 1).padStart(2, '0')}</Text>
        <View style={styles.tileRule} />
      </View>
      <View style={styles.text}>
        <Text style={styles.kicker} numberOfLines={1}>
          {t(`muscle.${e.muscle}`)} · {t(`equipment.${e.equipment}`)}
        </Text>
        <Text style={styles.name} numberOfLines={2}>
          {L(e.name)}
        </Text>
        <View style={styles.metaRow}>
          <SetBars sets={item.sets} />
          <Text style={styles.meta} numberOfLines={1}>
            {meta}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const TILE = 64;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.lg,
    paddingVertical: space.md,
  },
  tile: {
    width: TILE,
    height: TILE,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
  },
  index: { fontFamily: fonts.semibold, fontSize: 20, color: colors.textPrimary, letterSpacing: 0.5 },
  tileRule: { width: 16, height: 2, borderRadius: 1, backgroundColor: colors.accent },
  text: { flex: 1, minWidth: 0 },
  kicker: { ...type.caption, color: colors.textSecondary },
  name: { ...type.itemTitle, color: colors.textPrimary, marginTop: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.xxs },
  meta: { ...type.meta, color: colors.textSecondary, flexShrink: 1 },
});
