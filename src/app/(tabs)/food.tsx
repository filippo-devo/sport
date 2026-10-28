import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CaretLeftIcon, CaretRightIcon, ClockCounterClockwiseIcon, PlusIcon } from '../../components/icons';
import { MacroRings } from '../../components/MacroBars';
import { StartWorkoutButton } from '../../components/StartWorkoutButton';
import { Card, Divider, IconButton, SectionTitle } from '../../components/ui/controls';
import { TabHeader } from '../../components/ui/headers';
import { BottomFade, Screen, useLayout } from '../../components/ui/layout';
import { Ring } from '../../components/ui/Ring';
import { FOOD_BY_ID } from '../../data/foods';
import type { MealType } from '../../data/types';
import { useT } from '../../i18n';
import { addDays, dayKey, fromKey, weekDays } from '../../lib/date';
import { formatNumber } from '../../lib/units';
import { useStore } from '../../store';
import { entryNutrients, mealsOn, sumNutrients } from '../../store/derived';
import { useUi } from '../../store/ui';
import { colors, fonts, layout, radius, space, type } from '../../theme/tokens';

const MEALS: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

export default function FoodScreen() {
  const { t, L, weekdayShort, dateLong } = useT();
  const { contentWidth, tabBarSpace } = useLayout();
  const meals = useStore((s) => s.meals);
  const goals = useStore((s) => s.goals);
  const active = useStore((s) => s.active);
  const date = useUi((s) => s.foodDate);
  const setDate = useUi((s) => s.setFoodDate);

  const today = dayKey();
  const selected = fromKey(date);
  const entries = mealsOn(meals, date);
  const totals = sumNutrients(entries);
  const left = goals.kcal - totals.kcal;
  const days = weekDays(selected);
  const chip = Math.min(40, Math.floor(contentWidth / 7) - 8);
  const label = date === today ? t('common.today') : date === dayKey(addDays(new Date(), -1)) ? t('common.yesterday') : dateLong(selected);
  const ctaBottom = tabBarSpace - space.xxl + space.md + (active ? 62 : 0);

  return (
    <Screen
      tabBar
      bottomExtra={layout.ctaHeight + space.md}
      overlay={
        <>
          <BottomFade height={ctaBottom + layout.ctaHeight + 24} />
          <StartWorkoutButton bottom={ctaBottom} label={t('food.addMeal')} onPress={() => router.push('/add-meal')} />
        </>
      }
    >
      <TabHeader
        title={t('food.title')}
        right={<IconButton icon={ClockCounterClockwiseIcon} label={t('food.history')} onPress={() => router.push('/food-history')} />}
      />

      {/* Day navigation */}
      <View style={styles.dayNav}>
        <IconButton icon={CaretLeftIcon} label={t('food.prevDay')} size={36} tone="surface" iconColor={colors.textPrimary} onPress={() => setDate(dayKey(addDays(selected, -1)))} />
        <Text style={styles.dayLabel} numberOfLines={1}>
          {label}
        </Text>
        <IconButton
          icon={CaretRightIcon}
          label={t('food.nextDay')}
          size={36}
          tone="surface"
          iconColor={date >= today ? colors.track : colors.textPrimary}
          onPress={() => date < today && setDate(dayKey(addDays(selected, 1)))}
        />
      </View>
      <View style={styles.week}>
        {days.map((d) => {
          const key = dayKey(d);
          const kcal = sumNutrients(mealsOn(meals, key)).kcal;
          const isSel = key === date;
          const future = key > today;
          return (
            <Pressable
              key={key}
              disabled={future}
              onPress={() => setDate(key)}
              style={styles.weekDay}
              accessibilityRole="button"
              accessibilityState={{ selected: isSel, disabled: future }}
              accessibilityLabel={`${weekdayShort(d)} ${d.getDate()}: ${Math.round(kcal)} kcal`}
            >
              <Text style={[styles.weekLabel, key === today && { color: colors.accent }]}>{weekdayShort(d)}</Text>
              <Ring value={kcal / goals.kcal} size={chip} stroke={3} color={kcal > goals.kcal * 1.1 ? colors.protein : colors.accent} track={future ? colors.surface : colors.track}>
                <View style={[styles.weekInner, { width: chip - 8, height: chip - 8, borderRadius: (chip - 8) / 2 }, isSel && styles.weekInnerSel]}>
                  <Text style={[styles.weekDate, isSel && { color: colors.textOnAccent }, future && { color: colors.textSecondary }]}>{d.getDate()}</Text>
                </View>
              </Ring>
            </Pressable>
          );
        })}
      </View>

      {/* Calories + macros */}
      <Card style={styles.summary}>
        <View style={styles.kcalRow}>
          <Ring value={totals.kcal / goals.kcal} size={112} stroke={10} color={colors.accent}>
            <Text style={styles.ringBig}>{formatNumber(totals.kcal, 0)}</Text>
            <Text style={styles.ringSub}>kcal</Text>
          </Ring>
          <View style={styles.kcalStats}>
            <Stat label={t('food.eaten')} value={formatNumber(totals.kcal, 0)} />
            <Stat label={left >= 0 ? t('food.left') : t('food.over')} value={formatNumber(Math.abs(left), 0)} tone={left < 0 ? colors.protein : colors.accent} />
            <Text style={styles.goal}>{t('food.goal', { n: goals.kcal })} kcal</Text>
          </View>
        </View>
        <Divider />
        <MacroRings totals={totals} goals={goals} size={Math.min(78, Math.floor((contentWidth - space.lg * 2) / 3) - 16)} />
      </Card>

      {/* Meals */}
      {MEALS.map((m) => {
        const items = entries.filter((e) => e.meal === m);
        const kcal = sumNutrients(items).kcal;
        return (
          <View key={m} style={styles.meal}>
            <SectionTitle title={t(`meal.${m}`)} aside={items.length ? `${formatNumber(kcal, 0)} kcal` : undefined} />
            <Card style={styles.mealCard}>
              {items.map((e, i) => {
                const f = FOOD_BY_ID[e.foodId];
                const n = entryNutrients(e);
                return (
                  <View key={e.id}>
                    {i > 0 && <Divider />}
                    <Pressable style={styles.item} onPress={() => router.push(`/meal/${e.id}`)} accessibilityRole="button" accessibilityLabel={f ? L(f.name) : ''}>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={styles.itemName} numberOfLines={1}>
                          {f ? L(f.name) : '—'}
                        </Text>
                        <Text style={styles.itemMeta} numberOfLines={1}>
                          {e.grams} g · {e.time} · <Text style={{ color: colors.protein }}>{t('macro.p')} {Math.round(n.protein)}</Text> ·{' '}
                          <Text style={{ color: colors.carbs }}>{t('macro.c')} {Math.round(n.carbs)}</Text> ·{' '}
                          <Text style={{ color: colors.fat }}>{t('macro.f')} {Math.round(n.fat)}</Text>
                        </Text>
                      </View>
                      <Text style={styles.itemKcal}>{Math.round(n.kcal)}</Text>
                    </Pressable>
                  </View>
                );
              })}
              {items.length > 0 && <Divider />}
              <Pressable
                style={styles.addRow}
                onPress={() => router.push({ pathname: '/add-meal', params: { meal: m } })}
                accessibilityRole="button"
                accessibilityLabel={`${t('food.addMeal')}: ${t(`meal.${m}`)}`}
              >
                <View style={styles.addIcon}>
                  <PlusIcon size={14} color={colors.accent} weight="bold" />
                </View>
                <Text style={styles.addText}>{items.length ? t('food.addMeal') : t('food.nothing')}</Text>
              </Pressable>
            </Card>
          </View>
        );
      })}
    </Screen>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <View>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, tone ? { color: tone } : null]}>
        {value} <Text style={styles.statUnit}>kcal</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  dayNav: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginTop: space.xl },
  dayLabel: { ...type.navTitle, color: colors.textPrimary, flex: 1, textAlign: 'center', textTransform: 'capitalize' },
  week: { flexDirection: 'row', justifyContent: 'space-between', marginTop: space.lg },
  weekDay: { flex: 1, alignItems: 'center', gap: space.xs },
  weekLabel: { ...type.caption, color: colors.textSecondary },
  weekInner: { alignItems: 'center', justifyContent: 'center' },
  weekInnerSel: { backgroundColor: colors.accent },
  weekDate: { fontFamily: fonts.semibold, fontSize: 14, color: colors.textPrimary },
  summary: { marginTop: space.xl, gap: space.lg },
  kcalRow: { flexDirection: 'row', alignItems: 'center', gap: space.xl },
  ringBig: { fontFamily: fonts.bold, fontSize: 26, color: colors.textPrimary, lineHeight: 28 },
  ringSub: { fontFamily: fonts.medium, fontSize: 12, color: colors.textSecondary },
  kcalStats: { flex: 1, gap: space.sm },
  statLabel: { ...type.caption, color: colors.textSecondary },
  statValue: { fontFamily: fonts.bold, fontSize: 22, color: colors.textPrimary },
  statUnit: { fontFamily: fonts.medium, fontSize: 13, color: colors.textSecondary },
  goal: { ...type.caption, color: colors.textSecondary },
  meal: { marginTop: space.xxl },
  mealCard: { marginTop: space.md, paddingVertical: space.xs },
  item: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md },
  itemName: { ...type.itemTitle, color: colors.textPrimary },
  itemMeta: { ...type.caption, color: colors.textSecondary, marginTop: 2 },
  itemKcal: { fontFamily: fonts.semibold, fontSize: 16, color: colors.textPrimary, fontVariant: ['tabular-nums'] },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md },
  addIcon: { width: 26, height: 26, borderRadius: radius.pill, backgroundColor: colors.control, alignItems: 'center', justifyContent: 'center' },
  addText: { ...type.body, color: colors.textSecondary },
});
