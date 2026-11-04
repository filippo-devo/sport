import { router } from 'expo-router';
import { useMemo, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FireIcon, ForkKnifeIcon, QrCodeIcon, RobotIcon, ScalesIcon, SlidersHorizontalIcon, type Icon } from '../../components/icons';
import { LogWeightSheet } from '../../components/LogWeightSheet';
import { MacroBars } from '../../components/MacroBars';
import { SupplementsCard } from '../../components/nutrition/SupplementsCard';
import { WATER, WaterCard } from '../../components/nutrition/WaterCard';
import { PhotoCard } from '../../components/today/PhotoCard';
import { UnlockCard } from '../../components/today/UnlockCard';
import { WorkoutHero } from '../../components/today/WorkoutHero';
import { Card, IconButton, SectionTitle } from '../../components/ui/controls';
import { TabHeader } from '../../components/ui/headers';
import { Screen, useLayout } from '../../components/ui/layout';
import { Ring } from '../../components/ui/Ring';
import { useStartWorkout } from '../../components/useStartWorkout';
import type { TodayCard, TodayWidget } from '../../data/types';
import { useT } from '../../i18n';
import { dayKey } from '../../lib/date';
import { normalizeLayout } from '../../lib/today';
import { formatBodyWeight, formatNumber, toDisplayWeight } from '../../lib/units';
import { useTodaySteps } from '../../lib/useSteps';
import { useStore } from '../../store';
import { latestWeighIn, mealsOn, planWeek, sumNutrients } from '../../store/derived';
import { useActiveProgram } from '../../store/plans';
import { goalWeekStreak } from '../../store/stats';
import { colors, fonts, radius, space, type } from '../../theme/tokens';

/**
 * Today: "your day" at a glance. Greeting, streak and an edit button up top, three
 * user-chosen stat widgets, then cards in the order set in Edit Today (/today-edit).
 */
export default function TodayScreen() {
  const { t } = useT();
  const s = useStore();
  const { start, sheet, active } = useStartWorkout();
  const [weightOpen, setWeightOpen] = useState(false);

  const today = dayKey();
  const program = useActiveProgram();
  const week = useMemo(() => planWeek(program, s.sessions, new Date(), s.routines), [program, s.sessions, s.routines]);
  const todayPlan = week.find((d) => d.key === today)!;
  const next = week.find((d) => d.key > today && d.routine);
  const totals = sumNutrients(mealsOn(s.meals, today));
  const kcalLeft = s.goals.kcal - totals.kcal;
  const streak = goalWeekStreak(s.sessions, s.goals.workoutsPerWeek).current;
  const layout = normalizeLayout(s.todayLayout);
  const name = s.settings.name.trim().split(/\s+/)[0];

  const cards: Record<TodayCard, () => ReactNode> = {
    workout: () => (
      <WorkoutHero day={todayPlan} next={next} active={!!active} onStart={() => (active ? router.push('/workout') : start(todayPlan.routine?.id))} />
    ),
    nutrition: () => (
      <View>
        <SectionTitle title={t('today.nutrition')} aside={t('food.title')} onAside={() => router.push('/food')} />
        <Card style={styles.nutrition} onPress={() => router.push('/food')} accessibilityLabel={t('today.nutrition')}>
          <View style={styles.kcalRow}>
            <Text style={styles.kcalBig}>{formatNumber(Math.abs(kcalLeft), 0)}</Text>
            <Text style={styles.kcalLabel}>{kcalLeft >= 0 ? t('today.kcalLeftLabel') : t('today.kcalOverLabel')}</Text>
          </View>
          <MacroBars totals={totals} goals={s.goals} />
        </Card>
      </View>
    ),
    water: () => <WaterCard date={today} />,
    supplements: () => <SupplementsCard date={today} />,
    unlock: () => (
      <View>
        <SectionTitle title={t('unlock.title')} aside={s.unlock.on ? t('unlock.setup') : undefined} onAside={() => router.push('/unlock')} />
        <View style={styles.gapTop}>
          <UnlockCard />
        </View>
      </View>
    ),
    photo: () => (
      <View>
        <SectionTitle title={s.settings.photoEveryDays === 7 ? t('photo.titleWeekly') : t('photo.titleProgress')} aside={t('common.seeAll')} onAside={() => router.push('/progress')} />
        <View style={styles.gapTop}>
          <PhotoCard />
        </View>
      </View>
    ),
    quick: () => (
      <View>
        <SectionTitle title={t('today.quick')} />
        <View style={styles.quickGrid}>
          <QuickAction icon={ForkKnifeIcon} label={t('quick.addMeal')} onPress={() => router.push('/add-meal')} />
          <QuickAction icon={ScalesIcon} label={t('quick.logWeight')} onPress={() => setWeightOpen(true)} />
          <QuickAction icon={QrCodeIcon} label={t('quick.gym')} onPress={() => router.push('/gym')} />
          <QuickAction icon={RobotIcon} label={t('quick.coach')} onPress={() => router.push('/coach')} />
        </View>
      </View>
    ),
  };

  return (
    <Screen tabBar bottomExtra={active ? 62 : 0}>
      <TabHeader
        eyebrow={name ? t('today.hello', { name }) : t('today.helloNoName')}
        title={t('today.title')}
        right={
          <>
            <Pressable
              onPress={() => router.push('/progress')}
              style={({ pressed }) => [styles.streak, pressed && { opacity: 0.85 }]}
              accessibilityRole="button"
              accessibilityLabel={`${t('today.streak')}: ${streak}`}
            >
              <FireIcon size={18} color={streak > 0 ? '#FF8A3D' : colors.textSecondary} weight="fill" />
              <Text style={styles.streakText}>{streak}</Text>
            </Pressable>
            <IconButton icon={SlidersHorizontalIcon} label={t('today.edit')} onPress={() => router.push('/today-edit')} />
          </>
        }
      />

      {layout.widgets.length > 0 && (
        <View style={styles.widgets}>
          {layout.widgets.map((w) => (
            <Widget key={w} id={w} onWeight={() => setWeightOpen(true)} done={week.filter((d) => d.status === 'done').length} planned={week.filter((d) => d.routine || d.session).length} kcal={totals.kcal} protein={totals.protein} />
          ))}
        </View>
      )}

      {layout.cards
        .filter((c) => c.on)
        .map((c) => (
          <View key={c.id} style={styles.section}>
            {cards[c.id]()}
          </View>
        ))}

      <LogWeightSheet visible={weightOpen} onClose={() => setWeightOpen(false)} />
      {sheet}
    </Screen>
  );
}

function Widget({ id, kcal, protein, done, planned, onWeight }: { id: TodayWidget; kcal: number; protein: number; done: number; planned: number; onWeight: () => void }) {
  const { t } = useT();
  const { contentWidth } = useLayout();
  const goals = useStore((s) => s.goals);
  const units = useStore((s) => s.settings.units);
  const water = useStore((s) => s.water);
  const weighIns = useStore((s) => s.weighIns);
  const steps = useTodaySteps();
  const size = Math.min(78, Math.floor((contentWidth - space.sm * 2) / 3) - space.xl);

  const today = dayKey();
  const ml = water.filter((w) => w.date === today).reduce((n, w) => n + w.ml, 0);
  const latest = latestWeighIn(weighIns);

  const spec = {
    kcal: { value: kcal / goals.kcal, color: colors.accent, big: formatNumber(kcal, 0), label: t('today.calories'), sub: t('today.of', { n: goals.kcal }), go: () => router.push('/food') },
    workouts: { value: planned ? done / planned : 0, color: colors.success, big: `${done}/${planned}`, label: t('today.workouts'), sub: t('train.thisWeek'), go: () => router.push('/train') },
    steps: {
      value: steps != null ? steps / goals.steps : 0,
      color: colors.fat,
      big: steps != null ? (steps >= 1000 ? formatNumber(steps / 1000, 1) + 'k' : String(steps)) : '—',
      label: t('today.steps'),
      sub: steps != null ? t('today.of', { n: formatNumber(goals.steps, 0) }) : t('today.stepsUnavailable'),
      go: undefined,
    },
    water: { value: ml / goals.waterMl, color: WATER, big: ml >= 1000 ? formatNumber(ml / 1000, 1) + ' l' : String(ml), label: t('today.water'), sub: t('today.of', { n: `${formatNumber(goals.waterMl / 1000, 1)} l` }), go: () => router.push('/food') },
    protein: { value: protein / goals.protein, color: colors.protein, big: `${Math.round(protein)}`, label: t('today.protein'), sub: t('today.of', { n: `${goals.protein} g` }), go: () => router.push('/food') },
    weight: {
      value: latest ? 1 : 0,
      color: colors.textSecondary,
      big: latest ? formatNumber(toDisplayWeight(latest.kg, units), 1) : '—',
      label: t('today.weight'),
      sub: t('today.target', { w: formatBodyWeight(goals.targetWeight, units) }),
      go: onWeight,
    },
  }[id];

  return (
    <Pressable
      onPress={spec.go}
      disabled={!spec.go}
      style={({ pressed }) => [styles.widget, pressed && { opacity: 0.85 }]}
      accessibilityRole={spec.go ? 'button' : undefined}
      accessibilityLabel={`${spec.label}: ${spec.big} ${spec.sub}`}
    >
      <Ring value={spec.value} size={size} stroke={7} color={spec.color}>
        <Text style={[styles.widgetBig, size < 70 && { fontSize: 15 }]} numberOfLines={1}>
          {spec.big}
        </Text>
      </Ring>
      <Text style={styles.widgetLabel} numberOfLines={1}>
        {spec.label}
      </Text>
      <Text style={styles.widgetSub} numberOfLines={1}>
        {spec.sub}
      </Text>
    </Pressable>
  );
}

function QuickAction({ icon: Glyph, label, onPress }: { icon: Icon; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [styles.quick, pressed && { opacity: 0.85 }]}>
      <View style={styles.quickIcon}>
        <Glyph size={20} color={colors.accent} weight="bold" />
      </View>
      <Text style={styles.quickLabel} numberOfLines={2}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: space.xxl },
  gapTop: { marginTop: space.md },
  streak: {
    height: 44,
    paddingHorizontal: space.md + 2,
    borderRadius: radius.pill,
    backgroundColor: colors.control,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
  },
  streakText: { fontFamily: fonts.bold, fontSize: 17, color: colors.textPrimary },
  widgets: { flexDirection: 'row', gap: space.sm, marginTop: space.xl },
  widget: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: space.lg,
    paddingHorizontal: space.xs,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
  },
  widgetBig: { fontFamily: fonts.bold, fontSize: 17, color: colors.textPrimary },
  widgetLabel: { fontFamily: fonts.semibold, fontSize: 14, color: colors.textPrimary, marginTop: space.sm },
  widgetSub: { ...type.caption, color: colors.textSecondary, marginTop: 1 },
  nutrition: { gap: space.lg, marginTop: space.md },
  kcalRow: { flexDirection: 'row', alignItems: 'baseline', gap: space.sm },
  kcalBig: { fontFamily: fonts.bold, fontSize: 32, color: colors.textPrimary },
  kcalLabel: { ...type.body, color: colors.textSecondary },
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
  quickIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.control, alignItems: 'center', justifyContent: 'center' },
  quickLabel: { fontFamily: fonts.semibold, fontSize: 15, color: colors.textPrimary },
});
