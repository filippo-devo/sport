import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Exercise, SessionExercise, Units } from '../../data/types';
import { useT } from '../../i18n';
import { colors, fonts, radius, space, type } from '../../theme/tokens';
import { CheckIcon, DotsThreeIcon } from '../icons';
import { ExerciseThumb } from '../muscles/ExerciseMedia';
import { IconButton } from '../ui/controls';
import { exerciseSummary, isComplete } from './summary';

type Props = {
  exercise: Exercise;
  entry: SessionExercise;
  previous?: SessionExercise;
  units: Units;
  current: boolean;
  onPress: () => void;
  onMore: () => void;
};

/** One bar per set (max 6), volt once ticked off. */
function SetProgress({ sets }: { sets: boolean[] }) {
  const shown = sets.slice(0, 6);
  return (
    <View style={styles.bars}>
      {shown.map((done, i) => (
        <View
          key={i}
          style={{
            width: 3,
            height: shown.length > 1 ? 7 + (i * 6) / (shown.length - 1) : 13,
            borderRadius: 1,
            backgroundColor: done ? colors.accent : colors.textSecondary,
          }}
        />
      ))}
    </View>
  );
}

/** Live-workout list row: photo + muscle ring, name, sets summary; tap opens the exercise. */
export function WorkoutExerciseRow({ exercise, entry, previous, units, current, onPress, onMore }: Props) {
  const tr = useT();
  const { t, L } = tr;
  const complete = isComplete(entry);
  const doneCount = entry.sets.filter((s) => s.done).length;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t('workout.openExercise', { name: L(exercise.name) })}
      style={({ pressed }) => [styles.row, current && styles.rowCurrent, pressed && { opacity: 0.85 }]}
    >
      <ExerciseThumb exercise={exercise} size={78} />
      <View style={styles.main}>
        {current && entry.sets.length > 0 && (
          <Text style={styles.kicker}>{t('workout.setOf', { n: Math.min(doneCount + 1, entry.sets.length), m: entry.sets.length }).toUpperCase()}</Text>
        )}
        <Text style={styles.name} numberOfLines={2}>
          {L(exercise.name)}
        </Text>
        <View style={styles.meta}>
          <SetProgress sets={entry.sets.map((s) => s.done)} />
          <Text style={styles.metaText} numberOfLines={2}>
            {exerciseSummary(tr, exercise, entry, units, previous)}
          </Text>
        </View>
      </View>
      {complete ? (
        <View style={styles.done} accessibilityLabel={t('workout.exerciseDone')}>
          <CheckIcon size={15} color={colors.bg} weight="bold" />
        </View>
      ) : (
        <IconButton icon={DotsThreeIcon} label={t('common.more')} tone="surface" size={38} iconColor={colors.accent} onPress={onMore} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.lg, paddingVertical: space.md, paddingHorizontal: space.sm, borderRadius: radius.md },
  rowCurrent: { backgroundColor: 'rgba(210,254,8,0.06)', borderWidth: 1, borderColor: 'rgba(210,254,8,0.25)' },
  main: { flex: 1, minWidth: 0, gap: 4 },
  kicker: { ...type.caption, fontFamily: fonts.bold, color: colors.accent, letterSpacing: 0.4 },
  name: { fontFamily: fonts.semibold, fontSize: 17, lineHeight: 21, color: colors.textPrimary },
  meta: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  metaText: { flex: 1, fontFamily: fonts.regular, fontSize: 14, color: colors.textSecondary },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 13 },
  done: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.success, alignItems: 'center', justifyContent: 'center', marginRight: 6 },
});
