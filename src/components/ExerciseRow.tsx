import { StyleSheet, Text, View } from 'react-native';

import type { Equipment, Exercise } from '../data/training';
import { colors, fonts, radius, space, type } from '../theme/tokens';
import { SetBars } from './SetBars';

const equipmentLabel: Record<Equipment, string> = {
  barbell: 'Barbell',
  dumbbell: 'Dumbbells',
  cable: 'Cable',
  kettlebell: 'Kettlebell',
  machine: 'Machine',
  bodyweight: 'Bodyweight',
};

type Props = { exercise: Exercise; index: number };

// Mirrors Gravl's exercise row: square media tile, name, then
// "III 3 sets · 10–8 reps · 12 kg" in the secondary tone.
export function ExerciseRow({ exercise: e, index }: Props) {
  const meta = [`${e.sets} sets`, `${e.reps} reps`, e.weight].filter(Boolean).join(' · ');

  return (
    <View style={styles.row} accessible accessibilityLabel={`${index + 1}. ${e.name}, ${meta}`}>
      <View style={styles.tile}>
        <Text style={styles.index}>{String(index + 1).padStart(2, '0')}</Text>
        <View style={styles.tileRule} />
      </View>
      <View style={styles.text}>
        <Text style={styles.kicker} numberOfLines={1}>
          {e.muscle} · {equipmentLabel[e.equipment]}
        </Text>
        <Text style={styles.name} numberOfLines={2}>
          {e.name}
        </Text>
        <View style={styles.metaRow}>
          <SetBars sets={e.sets} />
          <Text style={styles.meta} numberOfLines={1}>
            {meta}
          </Text>
        </View>
      </View>
    </View>
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
