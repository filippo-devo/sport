import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { ExerciseRow } from '../../components/ExerciseRow';
import { PlayIcon } from '../../components/icons';
import { TargetMuscles } from '../../components/TargetMuscles';
import { Button, Divider, SectionTitle } from '../../components/ui/controls';
import { NavBar } from '../../components/ui/headers';
import { BottomFade, Screen, useLayout } from '../../components/ui/layout';
import { useStartWorkout } from '../../components/useStartWorkout';
import { useT } from '../../i18n';
import { useStore } from '../../store';
import { getRoutine, lastPerformance, muscleRecovery, routineMinutes, routineMuscles, routineSets } from '../../store/derived';
import { colors, layout, space, type } from '../../theme/tokens';

/** Routine preview with target muscles and the exercise list; starts the workout. */
export default function RoutineScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, tn, L } = useT();
  const { insets, gutter } = useLayout();
  const sessions = useStore((s) => s.sessions);
  const units = useStore((s) => s.settings.units);
  const { start, sheet, active } = useStartWorkout();
  const routine = getRoutine(id);
  if (!routine) return <Screen top={<NavBar />}>{null}</Screen>;

  const muscles = routineMuscles(routine)
    .slice(0, 3)
    .map((m) => ({ muscle: m, recovery: muscleRecovery(sessions, m) }));
  const isRunning = active?.routineId === routine.id;
  const bottom = Math.max(insets.bottom, space.lg);

  return (
    <Screen
      top={<NavBar />}
      bottomExtra={layout.ctaHeight + space.lg}
      overlay={
        <>
          <BottomFade height={bottom + layout.ctaHeight + 40} />
          <View style={[styles.cta, { bottom, left: gutter, right: gutter }]}>
            <Button
              label={isRunning ? t('train.resume') : t('train.start')}
              icon={PlayIcon}
              onPress={() => (isRunning ? router.push('/workout') : start(routine.id))}
            />
          </View>
        </>
      }
    >
      <Text style={styles.title}>{L(routine.name)}</Text>
      <Text style={styles.meta}>
        {t('unit.min', { n: routineMinutes(routine) })}  •  {tn('unit.exercises', routine.items.length)}  •  {tn('unit.sets', routineSets(routine))}
      </Text>

      <View style={styles.section}>
        <TargetMuscles muscles={muscles} />
      </View>

      <SectionTitle style={styles.section} title={tn('unit.exercises', routine.items.length)} />
      <View style={{ marginTop: space.xs }}>
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
      {sheet}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...type.display, color: colors.textPrimary, marginTop: space.sm },
  meta: { ...type.meta, color: colors.textSecondary, marginTop: space.sm },
  section: { marginTop: space.xxl },
  cta: { position: 'absolute' },
});
