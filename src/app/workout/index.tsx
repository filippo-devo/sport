import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { CaretDownIcon, PlusIcon, TrashIcon } from '../../components/icons';
import { Button, Card, IconButton } from '../../components/ui/controls';
import { NavBar } from '../../components/ui/headers';
import { Screen, useLayout } from '../../components/ui/layout';
import { ConfirmSheet, Sheet } from '../../components/ui/sheets';
import { ExerciseBlock } from '../../components/workout/ExerciseBlock';
import { RestTimerBar } from '../../components/workout/RestTimerBar';
import { EXERCISE_BY_ID } from '../../data/exercises';
import { useT } from '../../i18n';
import { clock } from '../../lib/date';
import { formatVolume } from '../../lib/units';
import { useNow } from '../../lib/useNow';
import { useStore } from '../../store';
import { doneSets, lastPerformance, setVolume } from '../../store/derived';
import { colors, fonts, space, type } from '../../theme/tokens';

export default function WorkoutScreen() {
  const { t, L } = useT();
  const { insets } = useLayout();
  const active = useStore((s) => s.active);
  const sessions = useStore((s) => s.sessions);
  const units = useStore((s) => s.settings.units);
  const haptics = useStore((s) => s.settings.haptics);
  const actions = useStore.getState();
  const now = useNow(1000);
  const [confirm, setConfirm] = useState<'finish' | 'discard' | null>(null);
  const [menuFor, setMenuFor] = useState<number | null>(null);

  // Rest finished: buzz once and clear the timer.
  const restDone = !!active?.rest && active.rest.endsAt <= now;
  useEffect(() => {
    if (!restDone) return;
    if (haptics && Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    useStore.getState().skipRest();
  }, [restDone, haptics]);

  if (!active) {
    return (
      <Screen top={<NavBar title={t('workout.inProgress')} />}>
        <Text style={styles.emptyText}>{t('history.empty')}</Text>
        <Button label={t('common.close')} variant="secondary" onPress={() => router.replace('/train')} />
      </Screen>
    );
  }

  const total = active.exercises.reduce((n, e) => n + e.sets.length, 0);
  const done = doneSets(active.exercises);
  const volume = active.exercises.reduce((n, e) => n + e.sets.reduce((m, s) => m + setVolume(s), 0), 0);
  const resting = active.rest && active.rest.endsAt > now;

  const finish = () => {
    const id = actions.finishWorkout();
    setConfirm(null);
    if (id) router.replace({ pathname: '/session/[id]', params: { id, fresh: '1' } });
    else router.replace('/train');
  };

  return (
    <Screen
      top={
        <NavBar
          title={L(active.name)}
          left={<IconButton icon={CaretDownIcon} label={t('workout.minimize')} onPress={() => (router.canGoBack() ? router.back() : router.replace('/train'))} />}
          right={<Button label={t('workout.finish')} size="sm" onPress={() => setConfirm(done ? 'finish' : 'discard')} />}
        />
      }
      bottomExtra={resting ? 96 : 0}
      scrollProps={{ automaticallyAdjustKeyboardInsets: true }}
      overlay={
        resting ? (
          <RestTimerBar
            rest={active.rest!}
            now={now}
            bottom={Math.max(insets.bottom, space.md) + space.xs}
            onAdjust={actions.adjustRest}
            onSkip={actions.skipRest}
          />
        ) : null
      }
    >
      <Card style={styles.stats}>
        <Stat label={t('workout.duration')} value={clock((now - active.startedAt) / 1000)} accent />
        <Stat label={t('workout.volume')} value={formatVolume(volume, units)} />
        <Stat label={t('workout.sets')} value={`${done}/${total}`} />
      </Card>

      <View style={styles.list}>
        {active.exercises.length === 0 && <Text style={styles.emptyText}>{t('workout.empty')}</Text>}
        {active.exercises.map((e, i) => (
          <ExerciseBlock
            key={`${e.exerciseId}-${i}`}
            index={i}
            exercise={e}
            previous={lastPerformance(sessions, e.exerciseId)}
            units={units}
            onUpdate={(set, patch) => actions.updateSet(i, set, patch)}
            onToggle={(set) => {
              if (haptics && Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              actions.toggleSet(i, set);
            }}
            onAddSet={() => actions.addSet(i)}
            onRemoveSet={(set) => actions.removeSet(i, set)}
            onMore={() => setMenuFor(i)}
          />
        ))}
      </View>

      <Button label={t('workout.addExercise')} icon={PlusIcon} variant="secondary" onPress={() => router.push('/exercise-picker')} style={styles.add} />
      <Button label={t('workout.discard')} variant="danger" icon={TrashIcon} onPress={() => setConfirm('discard')} style={styles.discard} />

      <Sheet visible={menuFor != null} onClose={() => setMenuFor(null)} title={menuFor != null ? L(EXERCISE_BY_ID[active.exercises[menuFor]?.exerciseId]?.name ?? { en: '', pl: '' }) : ''}>
        <Button
          label={t('workout.removeExercise')}
          variant="danger"
          icon={TrashIcon}
          onPress={() => {
            if (menuFor != null) actions.removeExercise(menuFor);
            setMenuFor(null);
          }}
        />
        <Button label={t('common.cancel')} variant="ghost" onPress={() => setMenuFor(null)} />
      </Sheet>

      <ConfirmSheet
        visible={confirm === 'finish'}
        title={t('workout.finishTitle')}
        body={t('workout.finishBody', { done, total })}
        confirmLabel={t('workout.finish')}
        onConfirm={finish}
        onCancel={() => setConfirm(null)}
      />
      <ConfirmSheet
        visible={confirm === 'discard'}
        title={t('workout.discard')}
        body={done ? t('workout.discardBody') : t('workout.finishEmpty')}
        confirmLabel={t('workout.discard')}
        destructive
        onConfirm={() => {
          setConfirm(null);
          actions.discardWorkout();
          router.replace('/train');
        }}
        onCancel={() => setConfirm(null)}
      />
    </Screen>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, accent && { color: colors.accent }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: 'row', paddingVertical: space.md },
  stat: { flex: 1, gap: 2 },
  statLabel: { ...type.caption, color: colors.textSecondary },
  statValue: { fontFamily: fonts.bold, fontSize: 20, color: colors.textPrimary, fontVariant: ['tabular-nums'] },
  list: { gap: space.md, marginTop: space.lg },
  emptyText: { ...type.body, color: colors.textSecondary, textAlign: 'center', marginVertical: space.xxl },
  add: { marginTop: space.lg },
  discard: { marginTop: space.md },
});
