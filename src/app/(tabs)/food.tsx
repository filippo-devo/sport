import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import {
  BowlFoodIcon,
  CheckIcon,
  ClockCounterClockwiseIcon,
  CoffeeIcon,
  CookieIcon,
  DropIcon,
  ForkKnifeIcon,
  type Icon,
  LightningIcon,
  MagnifyingGlassIcon,
  MicrophoneIcon,
  MinusIcon,
  PillIcon,
  PlusIcon,
} from '../../components/icons';
import { dosesPerDay, takenOn } from '../../components/nutrition/SupplementsCard';
import { WATER } from '../../components/nutrition/WaterCard';
import { Card, IconButton } from '../../components/ui/controls';
import { TabHeader } from '../../components/ui/headers';
import { Screen } from '../../components/ui/layout';
import { useSpokenMeal } from '../../components/voice/useSpokenMeal';
import { VoiceSheet } from '../../components/voice/VoiceSheet';
import type { MealType } from '../../data/types';
import { useT } from '../../i18n';
import { dayKey, fromKey } from '../../lib/date';
import { entryName } from '../../lib/meals';
import { formatNumber } from '../../lib/units';
import { useStore } from '../../store';
import { entryNutrients, mealsOn, sumNutrients } from '../../store/derived';
import { useUi } from '../../store/ui';
import { colors, fonts, radius, space, type } from '../../theme/tokens';

const MEALS: { type: MealType; icon: Icon; share: number }[] = [
  { type: 'breakfast', icon: CoffeeIcon, share: 0.25 },
  { type: 'lunch', icon: BowlFoodIcon, share: 0.35 },
  { type: 'dinner', icon: ForkKnifeIcon, share: 0.3 },
  { type: 'snack', icon: CookieIcon, share: 0.1 },
];

const GLASS_ML = 250;

export default function FoodScreen() {
  const { t, tn, dateLong } = useT();
  const meals = useStore((s) => s.meals);
  const goals = useStore((s) => s.goals);
  const date = useUi((s) => s.foodDate);
  const setDate = useUi((s) => s.setFoodDate);

  const today = dayKey();
  const entries = mealsOn(meals, date);
  const totals = sumNutrients(entries);
  const left = goals.kcal - totals.kcal;
  const addMeal = (params: Record<string, string> = {}) => router.push({ pathname: '/add-meal', params });
  const [voice, setVoice] = useState(false);
  const saveSpoken = useSpokenMeal();

  return (
    <Screen tabBar>
      <TabHeader
        eyebrow={date === today ? undefined : dateLong(fromKey(date))}
        title={t('food.title')}
        right={<IconButton icon={ClockCounterClockwiseIcon} label={t('food.history')} onPress={() => router.push('/food-history')} />}
      />
      {date !== today && (
        <Pressable style={styles.todayPill} onPress={() => setDate(today)} accessibilityRole="button">
          <Text style={styles.todayPillText}>{t('food.backToday')}</Text>
        </Pressable>
      )}

      {/* Calories gauge + macro bars */}
      <Card style={styles.hero}>
        <Gauge value={totals.kcal / goals.kcal} over={left < 0}>
          <Text style={[styles.bigNum, left < 0 && { color: colors.protein }]}>{formatNumber(Math.abs(left), 0)}</Text>
          <Text style={styles.bigSub}>{left >= 0 ? t('food.kcalLeft') : t('food.kcalOver')}</Text>
        </Gauge>
        <View style={styles.sides}>
          <Side value={formatNumber(totals.kcal, 0)} label={t('food.eaten')} />
          <Side value={formatNumber(goals.kcal, 0)} label={t('food.goalLabel')} />
        </View>
        <View style={styles.macros}>
          <Macro label={t('macro.protein')} value={totals.protein} goal={goals.protein} color={colors.protein} />
          <Macro label={t('macro.carbs')} value={totals.carbs} goal={goals.carbs} color={colors.carbs} />
          <Macro label={t('macro.fat')} value={totals.fat} goal={goals.fat} color={colors.fat} />
        </View>
      </Card>

      {/* Quick log */}
      <View style={styles.quick}>
        <Quick icon={MagnifyingGlassIcon} label={t('food.quickSearch')} onPress={() => addMeal({ mode: 'search' })} />
        <Quick icon={MicrophoneIcon} label={t('food.quickVoice')} onPress={() => setVoice(true)} />
        <Quick icon={ClockCounterClockwiseIcon} label={t('food.quickRecent')} onPress={() => addMeal()} />
        <Quick icon={LightningIcon} label={t('food.quickFast')} onPress={() => addMeal({ mode: 'manual' })} />
      </View>

      {/* Meals */}
      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>{t('food.meals')}</Text>
        <Text style={styles.sectionAside}>
          {formatNumber(totals.kcal, 0)} / {formatNumber(goals.kcal, 0)} kcal
        </Text>
      </View>
      <Card style={styles.mealsCard}>
        {MEALS.map((m, mi) => {
          const items = entries.filter((e) => e.meal === m.type);
          const kcal = sumNutrients(items).kcal;
          const MealIcon = m.icon;
          const logged = items.length > 0;
          return (
            <View key={m.type} style={[styles.meal, mi > 0 && styles.mealBorder]}>
              <View style={styles.mealRow}>
                <View style={[styles.mealIcon, logged && styles.mealIconDone]}>
                  <MealIcon size={22} color={logged ? colors.accent : colors.textSecondary} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.mealTitle}>{t(`meal.${m.type}`)}</Text>
                  <Text style={styles.mealMeta} numberOfLines={1}>
                    {logged ? `${formatNumber(kcal, 0)} kcal · ${tn('food.items', items.length)}` : t('food.suggested', { n: roundTo(goals.kcal * m.share, 50) })}
                  </Text>
                </View>
                <Pressable
                  onPress={() => addMeal({ meal: m.type })}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={`${t('food.addMeal')}: ${t(`meal.${m.type}`)}`}
                  style={({ pressed }) => [styles.plus, logged && styles.plusGhost, pressed && { opacity: 0.8 }]}
                >
                  <PlusIcon size={18} color={logged ? colors.accent : colors.textOnAccent} weight="bold" />
                </Pressable>
              </View>
              {items.map((e) => (
                <FoodItem key={e.id} id={e.id} entry={e} />
              ))}
            </View>
          );
        })}
      </Card>

      {/* Water + supplements */}
      <View style={styles.pair}>
        <WaterTile date={date} />
        <SupplementsTile date={date} />
      </View>

      <VoiceSheet
        visible={voice}
        onClose={() => setVoice(false)}
        title={t('voice.mealTitle')}
        examples={[t('voice.mealExample1'), t('voice.mealExample2')]}
        onSpoken={saveSpoken}
      />
    </Screen>
  );
}

const roundTo = (n: number, step: number) => Math.round(n / step) * step;

function FoodItem({ id, entry }: { id: string; entry: Parameters<typeof entryNutrients>[0] }) {
  const { t, L } = useT();
  const n = entryNutrients(entry);
  const name = entryName(entry, L);
  return (
    <Pressable style={({ pressed }) => [styles.item, pressed && { opacity: 0.85 }]} onPress={() => router.push(`/meal/${id}`)} accessibilityRole="button" accessibilityLabel={name}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.itemName} numberOfLines={1}>
          {name}
        </Text>
        <View style={styles.chips}>
          <Chip color={colors.protein} text={`${t('macro.p')} ${Math.round(n.protein)}`} />
          <Chip color={colors.carbs} text={`${t('macro.c')} ${Math.round(n.carbs)}`} />
          <Chip color={colors.fat} text={`${t('macro.f')} ${Math.round(n.fat)}`} />
        </View>
      </View>
      <Text style={styles.itemKcal}>{Math.round(n.kcal)}</Text>
    </Pressable>
  );
}

function Chip({ color, text }: { color: string; text: string }) {
  return (
    <View style={styles.chip}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={styles.chipText}>{text}</Text>
    </View>
  );
}

/** Half-circle calorie gauge (Lifesum-style). */
function Gauge({ value, over, children }: { value: number; over: boolean; children: ReactNode }) {
  const w = 240;
  const s = 14;
  const r = (w - s) / 2;
  const h = r + s / 2;
  const len = Math.PI * r;
  const p = Math.max(0, Math.min(1, value));
  const d = `M ${s / 2} ${h} A ${r} ${r} 0 0 1 ${w - s / 2} ${h}`;
  return (
    <View style={{ width: w, height: h + s / 2, alignSelf: 'center', alignItems: 'center', justifyContent: 'flex-end' }}>
      <Svg width={w} height={h + s / 2} style={StyleSheet.absoluteFill}>
        <Path d={d} stroke={colors.control} strokeWidth={s} fill="none" strokeLinecap="round" />
        {p > 0 && <Path d={d} stroke={over ? colors.protein : colors.accent} strokeWidth={s} fill="none" strokeLinecap="round" strokeDasharray={`${len * p} ${len}`} />}
      </Svg>
      <View style={{ alignItems: 'center', paddingBottom: space.xs }}>{children}</View>
    </View>
  );
}

function Side({ value, label }: { value: string; label: string }) {
  return (
    <View style={{ alignItems: 'center', minWidth: 64 }}>
      <Text style={styles.sideValue}>{value}</Text>
      <Text style={styles.sideLabel}>{label}</Text>
    </View>
  );
}

function Macro({ label, value, goal, color }: { label: string; value: number; goal: number; color: string }) {
  const p = goal > 0 ? Math.min(1, value / goal) : 0;
  return (
    <View style={{ flex: 1, minWidth: 0 }}>
      <View style={styles.macroHead}>
        <View style={[styles.dot, { backgroundColor: color, width: 8, height: 8 }]} />
        <Text style={styles.macroLabel} numberOfLines={1}>
          {label}
        </Text>
      </View>
      <View style={styles.bar}>
        <View style={[styles.barFill, { width: `${p * 100}%`, backgroundColor: color }]} />
      </View>
      <Text style={styles.macroValue}>
        {Math.round(value)} / {goal} g
      </Text>
    </View>
  );
}

function Quick({ icon: I, label, onPress }: { icon: Icon; label: string; onPress: () => void }) {
  return (
    <Pressable style={({ pressed }) => [styles.quickTile, pressed && { opacity: 0.85 }]} onPress={onPress} accessibilityRole="button" accessibilityLabel={label}>
      <I size={24} color={colors.accent} />
      <Text style={styles.quickLabel} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

function WaterTile({ date }: { date: string }) {
  const { t } = useT();
  const water = useStore((s) => s.water);
  const goal = useStore((s) => s.goals.waterMl);
  const addWater = useStore((s) => s.addWater);
  const deleteWater = useStore((s) => s.deleteWater);
  const entries = water.filter((w) => w.date === date);
  const total = entries.reduce((n, w) => n + w.ml, 0);
  const last = entries[entries.length - 1];
  const segments = Math.max(1, Math.round(goal / GLASS_ML));
  const filled = Math.min(segments, Math.floor(total / GLASS_ML));
  const litres = (ml: number) => formatNumber(ml / 1000, ml % 1000 === 0 ? 0 : ml % 100 === 0 ? 1 : 2);

  return (
    <Card style={styles.tile}>
      <View style={styles.tileHead}>
        <DropIcon size={18} color={WATER} weight="fill" />
        <Text style={styles.tileTitle}>{t('food.waterTitle')}</Text>
      </View>
      <Text style={styles.tileValue}>
        {litres(total)} <Text style={styles.tileUnit}>/ {litres(goal)} l</Text>
      </Text>
      <View style={styles.segments}>
        {Array.from({ length: Math.min(segments, 12) }, (_, i) => (
          <View key={i} style={[styles.segment, i < Math.round((filled / segments) * Math.min(segments, 12)) && { backgroundColor: WATER }]} />
        ))}
      </View>
      <View style={styles.waterBtns}>
        <Pressable
          style={({ pressed }) => [styles.waterBtn, pressed && { opacity: 0.8 }, !last && { opacity: 0.4 }]}
          disabled={!last}
          onPress={() => last && deleteWater(last.id)}
          accessibilityRole="button"
          accessibilityLabel={t('food.waterRemove')}
        >
          <MinusIcon size={18} color={colors.textPrimary} weight="bold" />
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.waterBtn, styles.waterBtnAdd, pressed && { opacity: 0.85 }]}
          onPress={() => addWater(GLASS_ML, date)}
          accessibilityRole="button"
          accessibilityLabel={t('food.waterAdd')}
        >
          <PlusIcon size={18} color={colors.textOnAccent} weight="bold" />
        </Pressable>
      </View>
    </Card>
  );
}

function SupplementsTile({ date }: { date: string }) {
  const { t } = useT();
  const supplements = useStore((s) => s.supplements).filter((s) => !s.archived);
  const logs = useStore((s) => s.supplementLogs);
  const take = useStore((s) => s.takeSupplement);
  const undo = useStore((s) => s.deleteSupplementLog);
  const total = supplements.reduce((n, s) => n + dosesPerDay(s), 0);
  const done = supplements.reduce((n, s) => n + Math.min(dosesPerDay(s), takenOn(logs, s.id, date).length), 0);
  const shown = supplements.slice(0, 3);

  return (
    <Card style={styles.tile}>
      <Pressable style={styles.tileHead} onPress={() => router.push('/supplements')} accessibilityRole="button" hitSlop={6}>
        <PillIcon size={18} color={colors.success} weight="fill" />
        <Text style={styles.tileTitle} numberOfLines={1}>
          {t('supp.title')}
        </Text>
      </Pressable>
      {supplements.length === 0 ? (
        <Pressable style={styles.suppEmpty} onPress={() => router.push('/supplements')} accessibilityRole="button">
          <View style={styles.suppAdd}>
            <PlusIcon size={16} color={colors.accent} weight="bold" />
          </View>
          <Text style={styles.suppEmptyText}>{t('food.suppAdd')}</Text>
        </Pressable>
      ) : (
        <>
          <Text style={styles.tileValue}>
            {done} <Text style={styles.tileUnit}>/ {total}</Text>
          </Text>
          {shown.map((s) => {
            const taken = takenOn(logs, s.id, date);
            const complete = taken.length >= dosesPerDay(s);
            const last = taken[taken.length - 1];
            return (
              <Pressable
                key={s.id}
                style={styles.suppRow}
                onPress={() => (complete && last ? undo(last.id) : take(s.id, date))}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: complete }}
                accessibilityLabel={s.name}
                hitSlop={4}
              >
                <View style={[styles.check, complete && styles.checkOn]}>{complete && <CheckIcon size={14} color={colors.textPrimary} weight="bold" />}</View>
                <Text style={styles.suppName} numberOfLines={1}>
                  {s.name}
                </Text>
                {!complete && s.times[taken.length] ? <Text style={styles.suppTime}>{s.times[taken.length]}</Text> : null}
              </Pressable>
            );
          })}
          {supplements.length > shown.length && (
            <Pressable onPress={() => router.push('/supplements')} accessibilityRole="button">
              <Text style={styles.suppMore}>+{supplements.length - shown.length}</Text>
            </Pressable>
          )}
        </>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  todayPill: { alignSelf: 'flex-start', marginTop: space.md, paddingHorizontal: space.md, paddingVertical: space.xs, borderRadius: radius.pill, backgroundColor: colors.control },
  todayPillText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.accent },

  hero: { marginTop: space.xl, paddingTop: space.xxl },
  bigNum: { fontFamily: fonts.bold, fontSize: 44, lineHeight: 46, color: colors.textPrimary, fontVariant: ['tabular-nums'] },
  bigSub: { ...type.caption, color: colors.textSecondary },
  sides: { flexDirection: 'row', justifyContent: 'space-between', marginTop: space.md },
  sideValue: { fontFamily: fonts.bold, fontSize: 18, color: colors.textPrimary, fontVariant: ['tabular-nums'] },
  sideLabel: { ...type.caption, color: colors.textSecondary },
  macros: { flexDirection: 'row', gap: space.md, marginTop: space.xl, paddingTop: space.lg, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.hairline },
  macroHead: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  macroLabel: { fontFamily: fonts.semibold, fontSize: 14, color: colors.textPrimary },
  bar: { height: 6, borderRadius: 3, backgroundColor: colors.control, marginTop: space.sm, marginBottom: space.xs, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3 },
  macroValue: { ...type.caption, color: colors.textSecondary, fontVariant: ['tabular-nums'] },

  quick: { flexDirection: 'row', gap: space.sm, marginTop: space.lg },
  quickTile: { flex: 1, alignItems: 'center', gap: space.sm, paddingVertical: space.md, borderRadius: radius.lg, backgroundColor: colors.surface },
  quickLabel: { fontFamily: fonts.semibold, fontSize: 13, color: colors.textPrimary },

  sectionHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: space.xxl },
  sectionTitle: { fontFamily: fonts.bold, fontSize: 22, color: colors.textPrimary },
  sectionAside: { ...type.body, color: colors.textSecondary, fontVariant: ['tabular-nums'] },
  mealsCard: { marginTop: space.md, paddingVertical: space.xxs },
  meal: { paddingVertical: space.md },
  mealBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.hairline },
  mealRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  mealIcon: { width: 42, height: 42, borderRadius: radius.md, backgroundColor: colors.control, alignItems: 'center', justifyContent: 'center' },
  mealIconDone: { backgroundColor: 'rgba(210,254,8,0.12)' },
  mealTitle: { fontFamily: fonts.semibold, fontSize: 17, color: colors.textPrimary },
  mealMeta: { ...type.caption, color: colors.textSecondary, marginTop: 2 },
  plus: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  plusGhost: { backgroundColor: colors.control },
  item: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginTop: space.sm, marginLeft: 54, paddingVertical: space.sm, paddingHorizontal: space.md, borderRadius: radius.sm, backgroundColor: colors.surfaceRaised },
  itemName: { fontFamily: fonts.semibold, fontSize: 15, color: colors.textPrimary },
  itemKcal: { fontFamily: fonts.semibold, fontSize: 15, color: colors.textPrimary, fontVariant: ['tabular-nums'] },
  chips: { flexDirection: 'row', gap: space.sm, marginTop: 2 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  chipText: { fontFamily: fonts.medium, fontSize: 12, color: colors.textSecondary },
  dot: { width: 6, height: 6, borderRadius: 4 },

  pair: { flexDirection: 'row', gap: space.sm, marginTop: space.xxl },
  tile: { flex: 1, minWidth: 0, gap: space.sm },
  tileHead: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  tileTitle: { fontFamily: fonts.semibold, fontSize: 14, color: colors.textSecondary, flexShrink: 1 },
  tileValue: { fontFamily: fonts.bold, fontSize: 24, color: colors.textPrimary, fontVariant: ['tabular-nums'] },
  tileUnit: { fontFamily: fonts.medium, fontSize: 13, color: colors.textSecondary },
  segments: { flexDirection: 'row', gap: 3 },
  segment: { flex: 1, height: 20, borderRadius: 5, backgroundColor: colors.control },
  waterBtns: { flexDirection: 'row', gap: space.xs, marginTop: space.xxs },
  waterBtn: { flex: 1, height: 36, borderRadius: radius.sm, backgroundColor: colors.control, alignItems: 'center', justifyContent: 'center' },
  waterBtnAdd: { backgroundColor: colors.accent },
  suppEmpty: { flex: 1, justifyContent: 'center', gap: space.sm, paddingVertical: space.sm },
  suppAdd: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.control, alignItems: 'center', justifyContent: 'center' },
  suppEmptyText: { ...type.caption, color: colors.textSecondary },
  suppRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  check: { width: 22, height: 22, borderRadius: 7, borderWidth: 1.5, borderColor: colors.cardStroke, alignItems: 'center', justifyContent: 'center' },
  checkOn: { backgroundColor: colors.success, borderColor: colors.success },
  suppName: { fontFamily: fonts.medium, fontSize: 14, color: colors.textPrimary, flex: 1 },
  suppTime: { ...type.caption, color: colors.textSecondary },
  suppMore: { ...type.caption, color: colors.accent },
});
