import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ExerciseRow } from '../../components/ExerciseRow';
import { CaretRightIcon, PlusIcon, FireIcon } from '../../components/icons';
import { StartWorkoutButton } from '../../components/StartWorkoutButton';
import { TargetMuscles } from '../../components/TargetMuscles';
import { Card, Divider, SectionTitle } from '../../components/ui/controls';
import { TabHeader } from '../../components/ui/headers';
import { BottomFade, Screen, useLayout } from '../../components/ui/layout';
import { useStartWorkout } from '../../components/useStartWorkout';
import { WeekStrip } from '../../components/WeekStrip';
import { WorkoutCard } from '../../components/WorkoutCard';
import { useT } from '../../i18n';
import { dayKey } from '../../lib/date';
import { useStore } from '../../store';
import { getProgram, lastPerformance, muscleRecovery, planWeek, routineMuscles, routineSets, weekStreak } from '../../store/derived';
import { colors, fonts, layout, radius, space, type } from '../../theme/tokens';

export default function TrainScreen() {
  const { t, tn, L, dateLong } = useT();
  const { compact, short, tabBarSpace, contentWidth } = useLayout();
  const sessions = useStore((s) => s.sessions);
  const programId = useStore((s) => s.activeProgramId);
  const units = useStore((s) => s.settings.units);
  const { start, sheet, active } = useStartWorkout();

  const program = getProgram(programId);
  const days = useMemo(() => planWeek(program, sessions), [program, sessions]);
  const [selectedKey, setSelectedKey] = useState(dayKey());
  const day = days.find((d) => d.key === selectedKey) ?? days[0];
  const routine = day.routine;
  const streak = weekStreak(sessions);

  const muscles = routine ? routineMuscles(routine).slice(0, 3).map((m) => ({ muscle: m, recovery: muscleRecovery(sessions, m) })) : [];
  const recovery = muscles.length ? Math.round(muscles.reduce((n, m) => n + m.recovery, 0) / muscles.length) : undefined;

  const isTodayWorkout = day.key === dayKey() && !!routine && day.status !== 'done';
  const resumable = active && active.routineId === routine?.id;
  const ctaBottom = tabBarSpace - space.xxl + space.md + (active ? 62 : 0);

  return (
    <Screen
      tabBar
      bottomExtra={isTodayWorkout ? layout.ctaHeight + space.md : 0}
      overlay={
        isTodayWorkout ? (
          <>
            <BottomFade height={ctaBottom + layout.ctaHeight + 24} />
            {!resumable && <StartWorkoutButton bottom={ctaBottom} label={t('train.start')} onPress={() => start(routine!.id)} />}
          </>
        ) : null
      }
    >
      <TabHeader
        eyebrow={dateLong(new Date())}
        title={t('train.title')}
        right={
          streak > 0 ? (
            <View style={styles.streak} accessible accessibilityLabel={`${t('today.streak')}: ${tn('unit.weeks', streak)}`}>
              <FireIcon size={18} color={colors.accent} weight="fill" />
              <Text style={styles.streakText}>{streak}</Text>
            </View>
          ) : null
        }
      />

      <View style={styles.section}>
        <WeekStrip days={days} selectedKey={day.key} onSelect={setSelectedKey} width={contentWidth} />
      </View>

      <View style={styles.section}>
        <WorkoutCard
          day={day}
          recovery={recovery}
          compact={compact}
          short={short}
          onPress={day.session ? () => router.push(`/session/${day.session!.id}`) : routine ? () => router.push(`/routine/${routine.id}`) : undefined}
        />
      </View>

      {routine && day.status !== 'done' && (
        <>
          <View style={styles.section}>
            <TargetMuscles muscles={muscles} />
          </View>

          <SectionTitle
            style={styles.section}
            title={tn('unit.exercises', routine.items.length)}
            aside={tn('unit.sets', routineSets(routine))}
          />
          <View style={styles.list}>
            {routine.items.map((item, i) => (
              <View key={item.exerciseId}>
                {i > 0 && <Divider inset={64 + space.lg} />}
                <ExerciseRow
                  item={item}
                  index={i}
                  units={units}
                  weight={lastPerformance(sessions, item.exerciseId)?.sets.find((s) => s.weight)?.weight}
                  onPress={() => router.push(`/exercise/${item.exerciseId}`)}
                />
              </View>
            ))}
          </View>
        </>
      )}

      <SectionTitle style={styles.section} title={t('train.plan')} aside={t('train.plans')} onAside={() => router.push('/plans')} />
      <View style={styles.planRow}>
        <Card style={styles.planCard} onPress={() => router.push(`/plans/${program.id}`)} accessibilityLabel={L(program.name)}>
          <Text style={styles.planName} numberOfLines={1}>
            {L(program.name)}
          </Text>
          <Text style={styles.planMeta}>{tn('plans.perWeek', program.schedule.filter(Boolean).length)}</Text>
          <CaretRightIcon size={16} color={colors.textSecondary} weight="bold" style={styles.planCaret} />
        </Card>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('train.emptyWorkout')}
          onPress={() => start()}
          style={({ pressed }) => [styles.emptyCard, pressed && { opacity: 0.85 }]}
        >
          <View style={styles.plus}>
            <PlusIcon size={18} color={colors.accent} weight="bold" />
          </View>
          <Text style={styles.planName} numberOfLines={1}>
            {t('train.emptyWorkout')}
          </Text>
          <Text style={styles.planMeta} numberOfLines={2}>
            {t('train.emptyWorkoutBody')}
          </Text>
        </Pressable>
      </View>
      {sheet}
    </Screen>
  );
}

const styles = StyleSheet.create({
  streak: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    height: layout.control,
    paddingHorizontal: space.md + 2,
    borderRadius: radius.pill,
    backgroundColor: colors.control,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
  },
  streakText: { fontFamily: fonts.semibold, fontSize: 16, color: colors.textPrimary },
  section: { marginTop: space.xxl + space.xxs },
  list: { marginTop: space.xs },
  planRow: { flexDirection: 'row', gap: space.md, marginTop: space.md },
  planCard: { flex: 1.2, minHeight: 112, justifyContent: 'flex-end' },
  planCaret: { position: 'absolute', top: space.lg, right: space.lg },
  planName: { ...type.itemTitle, color: colors.textPrimary },
  planMeta: { ...type.caption, color: colors.textSecondary, marginTop: 2 },
  emptyCard: {
    flex: 1,
    minHeight: 112,
    justifyContent: 'flex-end',
    padding: space.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.cardStroke,
  },
  plus: {
    position: 'absolute',
    top: space.md,
    left: space.md,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
