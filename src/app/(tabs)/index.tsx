import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BooksIcon, CaretRightIcon, FireIcon, ForkKnifeIcon, MoonIcon, PlayIcon, ScalesIcon, type Icon } from '../../components/icons';
import { LogWeightSheet } from '../../components/LogWeightSheet';
import { MacroBars } from '../../components/MacroBars';
import { Button, Card, SectionTitle } from '../../components/ui/controls';
import { TabHeader } from '../../components/ui/headers';
import { Screen, useLayout } from '../../components/ui/layout';
import { Ring } from '../../components/ui/Ring';
import { useStartWorkout } from '../../components/useStartWorkout';
import { useT } from '../../i18n';
import { dayKey } from '../../lib/date';
import { formatBodyWeight, formatNumber, formatVolume, toDisplayWeight } from '../../lib/units';
import { useTodaySteps } from '../../lib/useSteps';
import { useStore } from '../../store';
import {
  getProgram,
  latestWeighIn,
  mealsOn,
  planWeek,
  routineMinutes,
  sessionVolume,
  sumNutrients,
  weekStreak,
  weightChange,
} from '../../store/derived';
import { colors, fonts, radius, space, type } from '../../theme/tokens';

export default function TodayScreen() {
  const { t, tn, L, dateLong, weekdayLong } = useT();
  const { contentWidth } = useLayout();
  const s = useStore();
  const { start, sheet, active } = useStartWorkout();
  const steps = useTodaySteps();
  const [weightOpen, setWeightOpen] = useState(false);

  const today = dayKey();
  const week = useMemo(() => planWeek(getProgram(s.activeProgramId), s.sessions), [s.activeProgramId, s.sessions]);
  const todayPlan = week.find((d) => d.key === today)!;
  const planned = week.filter((d) => d.routine || d.session).length;
  const done = week.filter((d) => d.status === 'done').length;
  const next = week.find((d) => d.key > today && d.routine);

  const totals = sumNutrients(mealsOn(s.meals, today));
  const kcalLeft = s.goals.kcal - totals.kcal;
  const streak = weekStreak(s.sessions);
  const latest = latestWeighIn(s.weighIns);
  const delta = weightChange(s.weighIns, 7);
  const name = s.settings.name.trim().split(/\s+/)[0];

  const ringSize = Math.min(96, Math.floor((contentWidth - space.lg * 2 - space.md * 2) / 3));

  return (
    <Screen tabBar bottomExtra={active ? 62 : 0}>
      <TabHeader eyebrow={dateLong(new Date())} title={name ? `${t('today.title')}, ${name}` : t('today.title')} />

      {/* Whoop-style trio of daily rings */}
      <Card style={styles.rings}>
        <RingStat
          size={ringSize}
          value={totals.kcal / s.goals.kcal}
          color={colors.accent}
          big={formatNumber(totals.kcal, 0)}
          label={t('today.calories')}
          sub={`/ ${s.goals.kcal}`}
          onPress={() => router.push('/food')}
        />
        <RingStat
          size={ringSize}
          value={planned ? done / planned : 0}
          color={colors.success}
          big={`${done}/${planned}`}
          label={t('today.training')}
          sub={t('train.thisWeek')}
          onPress={() => router.push('/train')}
        />
        <RingStat
          size={ringSize}
          value={steps != null ? steps / s.goals.steps : 0}
          color={colors.fat}
          big={steps != null ? formatNumber(steps / 1000, 1) + 'k' : '—'}
          label={t('today.steps')}
          sub={steps != null ? `/ ${formatNumber(s.goals.steps / 1000, 0)}k` : t('today.stepsUnavailable')}
        />
      </Card>

      {/* Today's workout */}
      <SectionTitle style={styles.section} title={t('today.workout')} />
      {todayPlan.session ? (
        <Card style={styles.workout} onPress={() => router.push(`/session/${todayPlan.session!.id}`)}>
          <View style={styles.workoutText}>
            <Text style={styles.workoutKicker}>{t('today.doneTitle')}</Text>
            <Text style={styles.workoutName}>{L(todayPlan.session.name)}</Text>
            <Text style={styles.workoutMeta}>
              {t('today.doneBody', {
                name: tn('unit.exercises', todayPlan.session.exercises.length),
                min: Math.round((todayPlan.session.endedAt - todayPlan.session.startedAt) / 60000),
                volume: formatVolume(sessionVolume(todayPlan.session), s.settings.units),
              })}
            </Text>
          </View>
          <CaretRightIcon size={18} color={colors.textSecondary} weight="bold" />
        </Card>
      ) : todayPlan.routine ? (
        <Card style={styles.workoutCol}>
          <Pressable style={styles.workoutRow} onPress={() => router.push(`/routine/${todayPlan.routine!.id}`)} accessibilityRole="button">
            <View style={styles.workoutText}>
              <Text style={styles.workoutName}>{L(todayPlan.routine.name)}</Text>
              <Text style={styles.workoutMeta}>
                {t('unit.min', { n: routineMinutes(todayPlan.routine) })} · {tn('unit.exercises', todayPlan.routine.items.length)}
              </Text>
            </View>
            <CaretRightIcon size={18} color={colors.textSecondary} weight="bold" />
          </Pressable>
          <Button
            label={active ? t('quick.resumeWorkout') : t('train.start')}
            icon={PlayIcon}
            onPress={() => (active ? router.push('/workout') : start(todayPlan.routine!.id))}
          />
        </Card>
      ) : (
        <Card style={styles.workout}>
          <View style={styles.restIcon}>
            <MoonIcon size={20} color={colors.textPrimary} weight="fill" />
          </View>
          <View style={styles.workoutText}>
            <Text style={styles.workoutName}>{t('today.restDay')}</Text>
            {next?.routine && (
              <Text style={styles.workoutMeta}>{t('today.restBody', { name: L(next.routine.name), day: weekdayLong(next.date) })}</Text>
            )}
          </View>
        </Card>
      )}

      {/* Nutrition */}
      <SectionTitle style={styles.section} title={t('today.nutrition')} aside={t('food.title')} onAside={() => router.push('/food')} />
      <Card style={styles.nutrition} onPress={() => router.push('/food')} accessibilityLabel={t('today.nutrition')}>
        <View style={styles.kcalRow}>
          <Text style={styles.kcalBig}>{formatNumber(Math.abs(kcalLeft), 0)}</Text>
          <Text style={styles.kcalLabel}>{kcalLeft >= 0 ? t('today.kcalLeftLabel') : t('today.kcalOverLabel')}</Text>
        </View>
        <MacroBars totals={totals} goals={s.goals} />
      </Card>

      {/* Streak + body weight */}
      <View style={[styles.statsRow, styles.section]}>
        <Card style={styles.stat}>
          <View style={styles.statHead}>
            <FireIcon size={18} color={colors.accent} weight="fill" />
            <Text style={styles.statLabel}>{t('today.streak')}</Text>
          </View>
          <Text style={styles.statValue}>{tn('unit.weeks', streak)}</Text>
        </Card>
        <Card style={styles.stat} onPress={() => setWeightOpen(true)} accessibilityLabel={t('quick.logWeight')}>
          <View style={styles.statHead}>
            <ScalesIcon size={18} color={colors.textPrimary} weight="fill" />
            <Text style={styles.statLabel}>{t('today.bodyWeight')}</Text>
          </View>
          <Text style={styles.statValue}>{latest ? formatBodyWeight(latest.kg, s.settings.units) : '—'}</Text>
          <Text style={styles.statSub}>
            {delta != null
              ? t('today.weightDelta', { d: `${delta > 0 ? '+' : ''}${formatNumber(toDisplayWeight(delta, s.settings.units), 1)} ${s.settings.units}` })
              : t('today.noWeight')}
          </Text>
        </Card>
      </View>

      {/* Quick actions */}
      <SectionTitle style={styles.section} title={t('today.quick')} />
      <View style={styles.quickGrid}>
        <QuickAction
          icon={PlayIcon}
          label={active ? t('quick.resumeWorkout') : t('quick.startWorkout')}
          accent
          onPress={() => (active ? router.push('/workout') : start(todayPlan.routine?.id))}
        />
        <QuickAction icon={ForkKnifeIcon} label={t('quick.addMeal')} onPress={() => router.push('/add-meal')} />
        <QuickAction icon={ScalesIcon} label={t('quick.logWeight')} onPress={() => setWeightOpen(true)} />
        <QuickAction icon={BooksIcon} label={t('quick.library')} onPress={() => router.push('/library')} />
      </View>

      <LogWeightSheet visible={weightOpen} onClose={() => setWeightOpen(false)} />
      {sheet}
    </Screen>
  );
}

function RingStat({
  size,
  value,
  color,
  big,
  label,
  sub,
  onPress,
}: {
  size: number;
  value: number;
  color: string;
  big: string;
  label: string;
  sub: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={styles.ringItem}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${label}: ${big} ${sub}`}
    >
      <Ring value={value} size={size} stroke={8} color={color}>
        <Text style={[styles.ringBig, size < 84 && { fontSize: 16 }]} numberOfLines={1}>
          {big}
        </Text>
      </Ring>
      <Text style={styles.ringLabel}>{label}</Text>
      <Text style={styles.ringSub} numberOfLines={1}>
        {sub}
      </Text>
    </Pressable>
  );
}

function QuickAction({ icon: Glyph, label, onPress, accent }: { icon: Icon; label: string; onPress: () => void; accent?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.quick, accent && styles.quickAccent, pressed && { opacity: 0.85 }]}
    >
      <View style={[styles.quickIcon, accent && { backgroundColor: 'rgba(9,22,52,0.12)' }]}>
        <Glyph size={20} color={accent ? colors.textOnAccent : colors.accent} weight="bold" />
      </View>
      <Text style={[styles.quickLabel, accent && { color: colors.textOnAccent }]} numberOfLines={2}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: space.xxl + space.xxs },
  rings: { flexDirection: 'row', justifyContent: 'space-between', marginTop: space.xl, paddingVertical: space.xl },
  ringItem: { flex: 1, alignItems: 'center', gap: 3 },
  ringBig: { fontFamily: fonts.bold, fontSize: 19, color: colors.textPrimary },
  ringLabel: { fontFamily: fonts.semibold, fontSize: 14, color: colors.textPrimary, marginTop: space.sm },
  ringSub: { fontFamily: fonts.regular, fontSize: 12, color: colors.textSecondary },
  workout: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginTop: space.md },
  workoutCol: { gap: space.lg, marginTop: space.md },
  workoutRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  workoutText: { flex: 1, minWidth: 0 },
  workoutKicker: { ...type.caption, color: colors.success },
  workoutName: { ...type.itemTitle, fontFamily: fonts.semibold, fontSize: 19, color: colors.textPrimary },
  workoutMeta: { ...type.meta, color: colors.textSecondary, marginTop: 2 },
  restIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.control, alignItems: 'center', justifyContent: 'center' },
  nutrition: { gap: space.lg, marginTop: space.md },
  kcalRow: { flexDirection: 'row', alignItems: 'baseline', gap: space.sm },
  kcalBig: { fontFamily: fonts.bold, fontSize: 30, color: colors.textPrimary },
  kcalLabel: { ...type.body, color: colors.textSecondary },
  statsRow: { flexDirection: 'row', gap: space.md },
  stat: { flex: 1, gap: space.xs },
  statHead: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  statLabel: { ...type.caption, color: colors.textSecondary },
  statValue: { fontFamily: fonts.bold, fontSize: 22, color: colors.textPrimary, marginTop: space.xs },
  statSub: { ...type.caption, color: colors.textSecondary },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md, marginTop: space.md },
  quick: {
    width: '47.5%',
    flexGrow: 1,
    minHeight: 88,
    padding: space.md + 2,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    justifyContent: 'space-between',
    gap: space.sm,
  },
  quickAccent: { backgroundColor: colors.accent, borderColor: colors.accent },
  quickIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.control, alignItems: 'center', justifyContent: 'center' },
  quickLabel: { fontFamily: fonts.semibold, fontSize: 15, color: colors.textPrimary },
});
