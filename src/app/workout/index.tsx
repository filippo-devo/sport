import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { BackHandler, Platform, StyleSheet, Text, View } from 'react-native';

import { CaretDownIcon, PlusIcon, TrashIcon, XIcon } from '../../components/icons';
import { Button, IconButton } from '../../components/ui/controls';
import { NavBar } from '../../components/ui/headers';
import { BottomFade, Screen, useLayout } from '../../components/ui/layout';
import { ConfirmSheet, Sheet } from '../../components/ui/sheets';
import { logSpokenSets } from '../../components/voice/spokenSets';
import { ExerciseFocus } from '../../components/workout/ExerciseFocus';
import { RestTimerBar } from '../../components/workout/RestTimerBar';
import { isComplete } from '../../components/workout/summary';
import { WorkoutExerciseRow } from '../../components/workout/WorkoutExerciseRow';
import { EXERCISE_BY_ID } from '../../data/exercises';
import { useT } from '../../i18n';
import { clock } from '../../lib/date';
import { formatVolume } from '../../lib/units';
import { useNow } from '../../lib/useNow';
import { useStore } from '../../store';
import { doneSets, lastPerformance, setVolume } from '../../store/derived';
import { colors, fonts, layout, radius, space, type } from '../../theme/tokens';

export default function WorkoutScreen() {
  const tr = useT();
  const { t, tn, L } = tr;
  const { insets } = useLayout();
  const active = useStore((s) => s.active);
  const sessions = useStore((s) => s.sessions);
  const units = useStore((s) => s.settings.units);
  const haptics = useStore((s) => s.settings.haptics);
  const actions = useStore.getState();
  const now = useNow(1000);
  const [confirm, setConfirm] = useState<'finish' | 'discard' | null>(null);
  const [menuFor, setMenuFor] = useState<number | null>(null);
  // Index of the exercise opened full screen, or null for the list.
  const [focus, setFocus] = useState<number | null>(null);

  // Android back closes the single-exercise view before leaving the workout.
  useEffect(() => {
    if (focus == null) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setFocus(null);
      return true;
    });
    return () => sub.remove();
  }, [focus]);

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
  const currentIndex = active.exercises.findIndex((e) => !isComplete(e));
  const buzz = () => {
    if (haptics && Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  };

  const finish = () => {
    const id = actions.finishWorkout();
    setConfirm(null);
    if (id) router.replace({ pathname: '/session/[id]', params: { id, fresh: '1' } });
    else router.replace('/train');
  };

  const finishBottom = Math.max(insets.bottom, space.md) + space.xs;
  const focused = focus != null ? active.exercises[focus] : undefined;
  const focusedEx = focused ? EXERCISE_BY_ID[focused.exerciseId] : undefined;
  const nextIndex = focus != null ? active.exercises.findIndex((e, j) => j > focus && !isComplete(e)) : -1;
  const nextEntry = nextIndex >= 0 ? active.exercises[nextIndex] : undefined;
  const nextEx = nextEntry ? EXERCISE_BY_ID[nextEntry.exerciseId] : undefined;

  const sheets = (
    <>
      <Sheet visible={menuFor != null} onClose={() => setMenuFor(null)} title={menuFor != null ? L(EXERCISE_BY_ID[active.exercises[menuFor]?.exerciseId]?.name ?? { en: '', pl: '' }) : ''}>
        <Button
          label={t('workout.removeExercise')}
          variant="danger"
          icon={TrashIcon}
          onPress={() => {
            if (menuFor != null) actions.removeExercise(menuFor);
            setFocus(null);
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
    </>
  );

  if (focus != null && focused && focusedEx) {
    const i = focus;
    return (
      <>
        <ExerciseFocus
          position={i + 1}
          total={active.exercises.length}
          exercise={focusedEx}
          entry={focused}
          previous={lastPerformance(sessions, focused.exerciseId)}
          next={nextEntry && nextEx ? { exercise: nextEx, entry: nextEntry } : undefined}
          units={units}
          rest={active.rest}
          now={now}
          onBack={() => setFocus(null)}
          onMore={() => setMenuFor(i)}
          onUpdate={(set, patch) => actions.updateSet(i, set, patch)}
          onToggle={(set) => {
            buzz();
            actions.toggleSet(i, set);
          }}
          onAddSet={() => actions.addSet(i)}
          onRemoveSet={(set) => actions.removeSet(i, set)}
          onSetRest={(sec) => actions.setExerciseRest(i, sec)}
          onFinishExercise={() => {
            buzz();
            focused.sets.forEach((st, k) => {
              if (!st.done) useStore.getState().toggleSet(i, k);
            });
            setFocus(nextIndex >= 0 ? nextIndex : null);
          }}
          onOpenNext={() => setFocus(nextIndex >= 0 ? nextIndex : null)}
          onAdjustRest={actions.adjustRest}
          onSkipRest={actions.skipRest}
          onVoice={(text) => {
            const r = logSpokenSets(tr, i, text);
            if (r.ok) buzz();
            return r;
          }}
        />
        {sheets}
      </>
    );
  }

  return (
    <Screen
      top={
        <NavBar
          title={L(active.name)}
          left={<IconButton icon={CaretDownIcon} label={t('workout.minimize')} iconColor={colors.accent} onPress={() => (router.canGoBack() ? router.back() : router.replace('/train'))} />}
          right={<IconButton icon={XIcon} label={t('workout.discard')} iconColor={colors.danger} onPress={() => setConfirm('discard')} />}
        />
      }
      bottomExtra={layout.ctaHeight + space.xl + (resting ? 96 : 0)}
      overlay={
        <>
          <BottomFade height={finishBottom + layout.ctaHeight + space.xxxl} />
          {resting && (
            <RestTimerBar
              rest={active.rest!}
              now={now}
              bottom={finishBottom + layout.ctaHeight + space.md}
              onAdjust={actions.adjustRest}
              onSkip={actions.skipRest}
            />
          )}
          <View style={[styles.finishWrap, { bottom: finishBottom }]} pointerEvents="box-none">
            <Button label={t('workout.finish')} onPress={() => setConfirm(done ? 'finish' : 'discard')} style={styles.finish} />
          </View>
        </>
      }
    >
      <View style={styles.stats}>
        <Stat label={t('workout.duration')} value={clock((now - active.startedAt) / 1000)} accent />
        <Stat label={t('workout.volume')} value={formatVolume(volume, units)} />
        <Stat label={t('workout.sets')} value={`${done}/${total}`} />
      </View>

      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>{tn('workout.exerciseCount', active.exercises.length)}</Text>
        <IconButton icon={PlusIcon} label={t('workout.addExercise')} tone="surface" size={38} onPress={() => router.push('/exercise-picker')} style={styles.square} />
      </View>

      <View style={styles.list}>
        {active.exercises.length === 0 && <Text style={styles.emptyText}>{t('workout.empty')}</Text>}
        {active.exercises.map((e, i) => {
          const ex = EXERCISE_BY_ID[e.exerciseId];
          if (!ex) return null;
          return (
            <WorkoutExerciseRow
              key={`${e.exerciseId}-${i}`}
              exercise={ex}
              entry={e}
              previous={lastPerformance(sessions, e.exerciseId)}
              units={units}
              current={done > 0 && i === currentIndex}
              onPress={() => setFocus(i)}
              onMore={() => setMenuFor(i)}
            />
          );
        })}
      </View>

      {sheets}
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
  stats: {
    flexDirection: 'row',
    paddingTop: space.sm,
    paddingBottom: space.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.hairline,
  },
  stat: { flex: 1, gap: 2, alignItems: 'center' },
  statLabel: { ...type.body, color: colors.textSecondary },
  statValue: { fontFamily: fonts.bold, fontSize: 20, color: colors.textPrimary, fontVariant: ['tabular-nums'] },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.lg, marginBottom: space.xs },
  sectionTitle: { fontFamily: fonts.bold, fontSize: 20, color: colors.textPrimary },
  square: { borderRadius: radius.sm },
  list: { gap: space.xxs, marginHorizontal: -space.sm },
  emptyText: { ...type.body, color: colors.textSecondary, textAlign: 'center', marginVertical: space.xxl },
  finishWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  finish: { width: 230, borderRadius: radius.pill },
});
