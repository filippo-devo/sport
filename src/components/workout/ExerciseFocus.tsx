import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import type { Exercise, RestTimer, SessionExercise, SetEntry, Units } from '../../data/types';
import { useT } from '../../i18n';
import { clock } from '../../lib/date';
import { formatNumber, fromDisplayWeight, roundWeight, toDisplayWeight } from '../../lib/units';
import { colors, fonts, layout, radius, space, type } from '../../theme/tokens';
import { CaretLeftIcon, CheckIcon, ChecksIcon, DotsThreeIcon, InfoIcon, MicrophoneIcon, PlusIcon, TimerIcon } from '../icons';
import { ExerciseBackdrop, ExerciseThumb } from '../muscles/ExerciseMedia';
import { MuscleRing } from '../muscles/MuscleMap';
import { Chip, IconButton } from '../ui/controls';
import { useLayout } from '../ui/layout';
import { Sheet } from '../ui/sheets';
import { VoiceSheet, type VoiceOutcome } from '../voice/VoiceSheet';
import { NumCell } from './NumCell';
import { RestTimerBar } from './RestTimerBar';
import { nextSetIndex, setText } from './summary';

const REST_OPTIONS = [45, 60, 90, 120, 150, 180, 240];
const HERO = 300;

type Props = {
  position: number;
  total: number;
  exercise: Exercise;
  entry: SessionExercise;
  previous?: SessionExercise;
  next?: { exercise: Exercise; entry: SessionExercise };
  units: Units;
  rest: RestTimer | null;
  now: number;
  onBack: () => void;
  onMore: () => void;
  onUpdate: (set: number, patch: Partial<SetEntry>) => void;
  onToggle: (set: number) => void;
  onAddSet: () => void;
  onRemoveSet: (set: number) => void;
  onSetRest: (sec: number) => void;
  onFinishExercise: () => void;
  onOpenNext: () => void;
  onAdjustRest: (delta: number) => void;
  onSkipRest: () => void;
  /** "Zrobiłem 10 powtórzeń z 60 kg": logs the sets at once. */
  onVoice: (text: string) => VoiceOutcome;
};

/** Single exercise during a live workout: photo hero, big set cells, "Log set" bar. */
export function ExerciseFocus(p: Props) {
  const tr = useT();
  const { t, L } = tr;
  const { insets, frameWidth, gutter } = useLayout();
  const [restSheet, setRestSheet] = useState(false);
  const [voice, setVoice] = useState(false);
  const [barH, setBarH] = useState(0);
  const { exercise: ex, entry } = p;
  const tracking = ex.tracking;
  const current = nextSetIndex(entry);
  const allDone = current < 0;
  const targetNum = parseInt(entry.target ?? '', 10);
  const lastTime = setText(ex, p.previous?.sets.find((s) => setText(ex, s, p.units)), p.units);
  const resting = !!p.rest && p.rest.endsAt > p.now;

  const bottomPad = Math.max(insets.bottom, space.md);
  const barHeight = layout.ctaHeight + (p.next ? 64 : 0) + bottomPad + space.lg;

  const primaryLabel = !allDone ? t('workout.logSet', { n: current + 1 }) : p.next ? t('workout.nextExercise') : t('workout.backToList');
  const onPrimary = () => {
    if (!allDone) p.onToggle(current);
    else if (p.next) p.onOpenNext();
    else p.onBack();
  };

  const weightHint = (kg: number | undefined) => (kg ? formatNumber(roundWeight(toDisplayWeight(kg, p.units), p.units)) : '0');
  const repsCol = tracking === 'time' ? t('workout.colSec') : t('workout.colReps');
  const weightCol = ex.equipment === 'dumbbell' ? t('workout.colKgPerDb', { u: p.units.toUpperCase() }) : p.units.toUpperCase();

  return (
    <View style={styles.screen}>
      <View style={[styles.frame, { width: frameWidth }]}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          automaticallyAdjustKeyboardInsets
          contentContainerStyle={{ paddingBottom: barHeight + (resting ? 96 : 0) + space.lg }}
        >
          <View style={[styles.hero, { height: HERO + insets.top }]}>
            <ExerciseBackdrop id={ex.id} />
            <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" pointerEvents="none">
              <Defs>
                <LinearGradient id="focusShade" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={colors.bg} stopOpacity="0.45" />
                  <Stop offset="0.25" stopColor={colors.bg} stopOpacity="0" />
                  <Stop offset="0.5" stopColor={colors.bg} stopOpacity="0" />
                  <Stop offset="1" stopColor={colors.bg} stopOpacity="1" />
                </LinearGradient>
              </Defs>
              <Rect width="100%" height="100%" fill="url(#focusShade)" />
            </Svg>
            <View style={[styles.heroTop, { top: insets.top + space.xs, paddingHorizontal: gutter }]}>
              <IconButton icon={CaretLeftIcon} label={t('workout.backToList')} onPress={p.onBack} style={styles.glass} />
              <IconButton icon={DotsThreeIcon} label={t('common.more')} onPress={p.onMore} style={styles.glass} />
            </View>
            <View style={[styles.heroBody, { paddingHorizontal: gutter }]}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.kicker} numberOfLines={1}>
                  {`${t(`muscle.${ex.muscle}`)} · ${t(`equipment.${ex.equipment}`)} · ${p.position} / ${p.total}`.toUpperCase()}
                </Text>
                <Text style={styles.title} accessibilityRole="header">
                  {L(ex.name)}
                </Text>
              </View>
              <MuscleRing primary={ex.muscle} secondary={ex.secondary} size={72} />
            </View>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.chips, { paddingHorizontal: gutter }]}>
            <Chip icon={TimerIcon} label={t('routine.rest', { t: clock(entry.restSec) })} onPress={() => setRestSheet(true)} />
            <Chip icon={InfoIcon} label={t('workout.details')} onPress={() => router.push(`/exercise/${ex.id}`)} />
          </ScrollView>

          <View style={{ paddingHorizontal: gutter }}>
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>{t('workout.sets')}</Text>
              {lastTime ? <Text style={styles.sectionAside}>{t('workout.lastTime', { v: lastTime })}</Text> : null}
            </View>

            <View style={styles.tableHead}>
              <Text style={[styles.th, styles.colSet]}>{t('workout.colSet')}</Text>
              <Text style={[styles.th, styles.colNum]}>{repsCol}</Text>
              {tracking === 'weightReps' && (
                <Text style={[styles.th, styles.colNum]} numberOfLines={1}>
                  {weightCol}
                </Text>
              )}
            </View>

            {entry.sets.map((s, i) => {
              const prev = p.previous?.sets[i];
              const isCurrent = i === current;
              const future = !s.done && !isCurrent;
              const hint = (v: number | undefined) => (v != null ? String(v) : Number.isFinite(targetNum) ? String(targetNum) : '0');
              const cellStyle = [s.done && styles.cellDone, isCurrent && styles.cellCurrent, future && styles.cellFuture];
              return (
                <View key={i} style={styles.row}>
                  <Pressable
                    onPress={() => p.onToggle(i)}
                    onLongPress={() => p.onRemoveSet(i)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: s.done }}
                    accessibilityLabel={t('workout.markDone', { n: i + 1 })}
                    accessibilityHint={t('workout.removeSet')}
                    style={[styles.setNo, styles.colSet, s.done && styles.setNoDone, isCurrent && styles.cellCurrent]}
                  >
                    {s.done ? (
                      <CheckIcon size={18} color={colors.textOnAccent} weight="bold" />
                    ) : (
                      <Text style={[styles.setNoText, future && { color: colors.textSecondary }]}>{i + 1}</Text>
                    )}
                  </Pressable>
                  {tracking !== 'time' ? (
                    <View style={styles.colNum}>
                      <NumCell
                        large
                        label={`${repsCol} ${i + 1}`}
                        value={s.reps}
                        placeholder={hint(prev?.reps)}
                        onCommit={(v) => p.onUpdate(i, { reps: v != null ? Math.round(v) : undefined })}
                        style={cellStyle}
                      />
                    </View>
                  ) : (
                    <View style={styles.colNum}>
                      <NumCell
                        large
                        label={`${repsCol} ${i + 1}`}
                        value={s.seconds}
                        placeholder={hint(prev?.seconds)}
                        onCommit={(v) => p.onUpdate(i, { seconds: v != null ? Math.round(v) : undefined })}
                        style={cellStyle}
                      />
                    </View>
                  )}
                  {tracking === 'weightReps' && (
                    <View style={styles.colNum}>
                      <NumCell
                        large
                        decimals={1}
                        label={`${weightCol} ${i + 1}`}
                        value={s.weight != null ? roundWeight(toDisplayWeight(s.weight, p.units), p.units) : undefined}
                        placeholder={weightHint(prev?.weight ?? entry.weight ?? entry.sets.slice(0, i).reverse().find((x) => x.weight)?.weight)}
                        onCommit={(v) => p.onUpdate(i, { weight: v != null ? fromDisplayWeight(v, p.units) : undefined })}
                        style={cellStyle}
                      />
                    </View>
                  )}
                </View>
              );
            })}

            <Pressable onPress={p.onAddSet} accessibilityRole="button" style={({ pressed }) => [styles.addSet, pressed && { opacity: 0.8 }]}>
              <PlusIcon size={15} color={colors.textSecondary} weight="bold" />
              <Text style={styles.addSetText}>{t('workout.addSet')}</Text>
            </Pressable>
          </View>
        </ScrollView>

        {resting && (
          <RestTimerBar rest={p.rest!} now={p.now} bottom={(barH || barHeight) + space.xs} onAdjust={p.onAdjustRest} onSkip={p.onSkipRest} />
        )}

        <View onLayout={(e) => setBarH(e.nativeEvent.layout.height)} style={[styles.bar, { paddingBottom: bottomPad, paddingHorizontal: gutter }]}>
          {p.next && (
            <Pressable onPress={p.onOpenNext} accessibilityRole="button" style={({ pressed }) => [styles.next, pressed && { opacity: 0.85 }]}>
              <ExerciseThumb exercise={p.next.exercise} size={40} ring={false} />
              <Text style={styles.nextText} numberOfLines={1}>
                {t('workout.upNext')} <Text style={styles.nextName}>{L(p.next.exercise.name)}</Text>
              </Text>
              <Text style={styles.nextMeta} numberOfLines={1}>
                {tr.tn('unit.sets', p.next.entry.sets.length)}
              </Text>
            </Pressable>
          )}
          <View style={styles.buttons}>
            <IconButton icon={MicrophoneIcon} label={t('voice.setsTitle')} size={layout.ctaHeight + 4} tone="surface" onPress={() => setVoice(true)} />
            <Pressable onPress={onPrimary} accessibilityRole="button" style={({ pressed }) => [styles.primary, pressed && { opacity: 0.9 }]}>
              <Text style={styles.primaryText}>{primaryLabel}</Text>
            </Pressable>
            {!allDone && (
              <IconButton icon={ChecksIcon} label={t('workout.finishExercise')} size={layout.ctaHeight + 4} onPress={p.onFinishExercise} />
            )}
          </View>
        </View>
      </View>

      <VoiceSheet
        visible={voice}
        onClose={() => setVoice(false)}
        title={t('voice.setsTitle')}
        examples={tracking === 'time' ? [t('voice.timeExample')] : [t('voice.setsExample1'), t('voice.setsExample2')]}
        onSpoken={p.onVoice}
      />

      <Sheet visible={restSheet} onClose={() => setRestSheet(false)} title={t('workout.restTitle')}>
        <View style={styles.restOptions}>
          {REST_OPTIONS.map((sec) => (
            <Chip
              key={sec}
              label={clock(sec)}
              selected={sec === entry.restSec}
              onPress={() => {
                p.onSetRest(sec);
                setRestSheet(false);
              }}
            />
          ))}
        </View>
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, alignItems: 'center' },
  frame: { flex: 1 },
  hero: { justifyContent: 'flex-end', overflow: 'hidden', backgroundColor: colors.surface },
  heroTop: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between' },
  glass: { backgroundColor: 'rgba(38,48,58,0.65)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.18)' },
  heroBody: { flexDirection: 'row', alignItems: 'flex-end', gap: space.md, paddingBottom: space.md },
  kicker: { ...type.caption, color: colors.accent, letterSpacing: 1 },
  title: { ...type.heroTitle, fontSize: 26, lineHeight: 30, color: colors.textPrimary, marginTop: space.xxs },
  chips: { gap: space.sm, paddingVertical: space.md },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: space.md,
    paddingTop: space.xs,
    paddingBottom: space.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.hairline,
  },
  sectionTitle: { fontFamily: fonts.bold, fontSize: 19, color: colors.textPrimary },
  sectionAside: { flexShrink: 1, ...type.caption, fontSize: 13, color: colors.textSecondary },
  tableHead: { flexDirection: 'row', gap: space.md, paddingTop: space.md, paddingBottom: space.xs },
  th: { fontFamily: fonts.semibold, fontSize: 12, letterSpacing: 0.6, color: colors.textSecondary, textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 5 },
  colSet: { width: 54 },
  colNum: { flex: 1, minWidth: 0, flexDirection: 'row' },
  setNo: { height: 50, borderRadius: radius.md, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  setNoDone: { backgroundColor: colors.accent },
  setNoText: { fontFamily: fonts.bold, fontSize: 17, color: colors.textPrimary },
  cellDone: { backgroundColor: 'rgba(210,254,8,0.10)' },
  cellCurrent: { borderWidth: 1.5, borderColor: 'rgba(210,254,8,0.7)', backgroundColor: colors.surfaceRaised },
  cellFuture: { color: colors.textSecondary },
  addSet: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
    height: 42,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.15)',
    marginTop: space.sm,
  },
  addSetText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.textSecondary },
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: space.md, backgroundColor: colors.bg, gap: space.md },
  next: { flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: colors.surface, borderRadius: radius.md, padding: space.sm, paddingRight: space.md },
  nextText: { flex: 1, minWidth: 0, ...type.caption, fontSize: 13, color: colors.textSecondary },
  nextName: { fontFamily: fonts.semibold, color: colors.textPrimary },
  nextMeta: { ...type.caption, fontSize: 13, color: colors.textSecondary },
  buttons: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  primary: { flex: 1, height: layout.ctaHeight + 4, borderRadius: radius.pill, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  primaryText: { fontFamily: fonts.bold, fontSize: 18, color: colors.textOnAccent },
  restOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginBottom: space.md },
});
