import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { EXERCISE_BY_ID } from '../../data/exercises';
import type { SessionExercise, SetEntry, Units } from '../../data/types';
import { useT } from '../../i18n';
import { clock } from '../../lib/date';
import { formatNumber, formatWeight, fromDisplayWeight, roundWeight, toDisplayWeight } from '../../lib/units';
import { colors, fonts, radius, space, type } from '../../theme/tokens';
import { ExerciseTile } from '../EquipmentGlyph';
import { CheckIcon, DotsThreeIcon, PlusIcon } from '../icons';
import { IconButton } from '../ui/controls';
import { NumCell } from './NumCell';

type Props = {
  index: number;
  exercise: SessionExercise;
  previous?: SessionExercise;
  units: Units;
  onUpdate: (set: number, patch: Partial<SetEntry>) => void;
  onToggle: (set: number) => void;
  onAddSet: () => void;
  onRemoveSet: (set: number) => void;
  onMore: () => void;
};

/** One exercise in the live logger: header + SET | PREVIOUS | KG | REPS | ✓ table (Hevy). */
export function ExerciseBlock({ exercise, previous, units, onUpdate, onToggle, onAddSet, onRemoveSet, onMore }: Props) {
  const { t, tn, L } = useT();
  const ex = EXERCISE_BY_ID[exercise.exerciseId];
  if (!ex) return null;
  const tracking = ex.tracking;
  const targetText = exercise.target
    ? `${tn('unit.sets', exercise.sets.length)} · ${tracking === 'time' ? t('unit.secRange', { r: exercise.target }) : t('unit.repsRange', { r: exercise.target })}`
    : tn('unit.sets', exercise.sets.length);

  const prevText = (p?: SetEntry) => {
    if (!p) return '—';
    if (tracking === 'time') return p.seconds ? `${p.seconds} s` : '—';
    if (tracking === 'reps') return p.reps ? `× ${p.reps}` : '—';
    return p.weight && p.reps ? `${formatWeight(p.weight, units, false)} × ${p.reps}` : '—';
  };

  return (
    <View style={styles.block}>
      <View style={styles.head}>
        <Pressable style={styles.headMain} onPress={() => router.push(`/exercise/${ex.id}`)} accessibilityRole="button">
          <ExerciseTile equipment={ex.equipment} size={44} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.name} numberOfLines={2}>
              {L(ex.name)}
            </Text>
            <Text style={styles.target} numberOfLines={1}>
              {targetText} · {t('routine.rest', { t: clock(exercise.restSec) })}
            </Text>
          </View>
        </Pressable>
        <IconButton icon={DotsThreeIcon} label={t('common.more')} tone="surface" size={36} onPress={onMore} />
      </View>

      <View style={styles.tableHead}>
        <Text style={[styles.th, styles.colSet]}>{t('workout.colSet')}</Text>
        <Text style={[styles.th, styles.colPrev]} numberOfLines={1}>
          {t('workout.colPrevious')}
        </Text>
        {tracking === 'weightReps' && <Text style={[styles.th, styles.colNum]}>{units.toUpperCase()}</Text>}
        {tracking !== 'time' && <Text style={[styles.th, styles.colNum]}>{t('workout.colReps')}</Text>}
        {tracking === 'time' && <Text style={[styles.th, styles.colNum]}>{t('workout.colSec')}</Text>}
        <View style={styles.colCheck}>
          <CheckIcon size={14} color={colors.textSecondary} weight="bold" />
        </View>
      </View>

      {exercise.sets.map((s, i) => {
        const p = previous?.sets[i];
        const targetNum = parseInt(exercise.target ?? '', 10);
        return (
          <View key={i} style={[styles.row, s.done && styles.rowDone]}>
            <Pressable
              style={styles.colSet}
              onLongPress={() => onRemoveSet(i)}
              accessibilityLabel={`${t('workout.colSet')} ${i + 1}`}
              accessibilityHint={t('workout.removeSet')}
            >
              <Text style={[styles.setNo, s.done && { color: colors.accent }]}>{i + 1}</Text>
            </Pressable>
            <Text style={[styles.prev, styles.colPrev]} numberOfLines={1}>
              {prevText(p)}
            </Text>
            {tracking === 'weightReps' && (
              <View style={styles.colNum}>
                <NumCell
                  label={`${units} ${i + 1}`}
                  decimals={1}
                  done={s.done}
                  value={s.weight != null ? roundWeight(toDisplayWeight(s.weight, units), units) : undefined}
                  placeholder={p?.weight ? formatNumber(roundWeight(toDisplayWeight(p.weight, units), units)) : '0'}
                  onCommit={(v) => onUpdate(i, { weight: v != null ? fromDisplayWeight(v, units) : undefined })}
                />
              </View>
            )}
            {tracking !== 'time' && (
              <View style={styles.colNum}>
                <NumCell
                  label={`${t('workout.colReps')} ${i + 1}`}
                  done={s.done}
                  value={s.reps}
                  placeholder={String(p?.reps ?? (Number.isFinite(targetNum) ? targetNum : 0))}
                  onCommit={(v) => onUpdate(i, { reps: v != null ? Math.round(v) : undefined })}
                />
              </View>
            )}
            {tracking === 'time' && (
              <View style={styles.colNum}>
                <NumCell
                  label={`${t('workout.colSec')} ${i + 1}`}
                  done={s.done}
                  value={s.seconds}
                  placeholder={String(p?.seconds ?? (Number.isFinite(targetNum) ? targetNum : 0))}
                  onCommit={(v) => onUpdate(i, { seconds: v != null ? Math.round(v) : undefined })}
                />
              </View>
            )}
            <View style={styles.colCheck}>
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: s.done }}
                accessibilityLabel={t('workout.markDone', { n: i + 1 })}
                onPress={() => onToggle(i)}
                hitSlop={6}
                style={[styles.check, s.done && styles.checkDone]}
              >
                <CheckIcon size={16} color={s.done ? colors.textOnAccent : colors.textSecondary} weight="bold" />
              </Pressable>
            </View>
          </View>
        );
      })}

      <Pressable onPress={onAddSet} style={({ pressed }) => [styles.addSet, pressed && { opacity: 0.8 }]} accessibilityRole="button">
        <PlusIcon size={15} color={colors.textPrimary} weight="bold" />
        <Text style={styles.addSetText}>{t('workout.addSet')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    paddingVertical: space.md,
    paddingHorizontal: space.md,
    gap: space.xs,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginBottom: space.sm },
  headMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.md, minWidth: 0 },
  name: { ...type.itemTitle, fontFamily: fonts.semibold, color: colors.textPrimary },
  target: { ...type.caption, color: colors.textSecondary, marginTop: 2 },
  tableHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: 2 },
  th: { fontFamily: fonts.semibold, fontSize: 11, letterSpacing: 0.6, color: colors.textSecondary, textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: 4, paddingHorizontal: 2, borderRadius: radius.sm },
  rowDone: { backgroundColor: 'rgba(219,253,82,0.08)' },
  colSet: { width: 34, alignItems: 'center' },
  colPrev: { flex: 1.25, minWidth: 0 },
  colNum: { flex: 1, minWidth: 0 },
  colCheck: { width: 38, alignItems: 'center' },
  setNo: { fontFamily: fonts.semibold, fontSize: 16, color: colors.textPrimary, textAlign: 'center' },
  prev: { fontFamily: fonts.regular, fontSize: 14, color: colors.textSecondary, textAlign: 'center', fontVariant: ['tabular-nums'] },
  check: { width: 34, height: 34, borderRadius: radius.sm, backgroundColor: colors.control, alignItems: 'center', justifyContent: 'center' },
  checkDone: { backgroundColor: colors.accent },
  addSet: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
    height: 38,
    borderRadius: radius.sm,
    backgroundColor: colors.control,
    marginTop: space.sm,
  },
  addSetText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.textPrimary },
});
