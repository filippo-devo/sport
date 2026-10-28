import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { TrashIcon } from '../../components/icons';
import { Button, Card, Divider, SectionTitle } from '../../components/ui/controls';
import { NavBar } from '../../components/ui/headers';
import { Screen } from '../../components/ui/layout';
import { ConfirmSheet } from '../../components/ui/sheets';
import { FOOD_BY_ID } from '../../data/foods';
import { useT } from '../../i18n';
import { fromKey } from '../../lib/date';
import { formatNumber } from '../../lib/units';
import { useStore } from '../../store';
import { entryNutrients } from '../../store/derived';
import { colors, fonts, radius, space, type } from '../../theme/tokens';

/** One diary entry: energy, macro split, fibre/sugar and per-100 g values. */
export default function MealDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, L, dateLong } = useT();
  const entry = useStore((s) => s.meals.find((m) => m.id === id));
  const goals = useStore((s) => s.goals);
  const deleteMeal = useStore((s) => s.deleteMeal);
  const [confirm, setConfirm] = useState(false);
  const food = entry ? FOOD_BY_ID[entry.foodId] : undefined;
  if (!entry || !food) return <Screen top={<NavBar />}>{null}</Screen>;

  const n = entryNutrients(entry);
  const kcalP = n.protein * 4;
  const kcalC = n.carbs * 4;
  const kcalF = n.fat * 9;
  const kcalSum = kcalP + kcalC + kcalF || 1;
  const macros = [
    { label: t('macro.protein'), g: n.protein, kcal: kcalP, color: colors.protein, goal: goals.protein },
    { label: t('macro.carbs'), g: n.carbs, kcal: kcalC, color: colors.carbs, goal: goals.carbs },
    { label: t('macro.fat'), g: n.fat, kcal: kcalF, color: colors.fat, goal: goals.fat },
  ];

  return (
    <Screen top={<NavBar title={t(`meal.${entry.meal}`)} />}>
      <Text style={styles.title}>{L(food.name)}</Text>
      <Text style={styles.sub}>
        {dateLong(fromKey(entry.date))} · {entry.time}
      </Text>

      <View style={styles.stats}>
        <Card style={styles.stat}>
          <Text style={styles.statLabel}>{t('mealDetail.energy')}</Text>
          <Text style={styles.statValue}>
            {Math.round(n.kcal)} <Text style={styles.statUnit}>kcal</Text>
          </Text>
          <Text style={styles.statFoot}>{t('food.ofGoal', { p: Math.round((n.kcal / goals.kcal) * 100) })}</Text>
        </Card>
        <Card style={styles.stat}>
          <Text style={styles.statLabel}>{t('mealDetail.amount')}</Text>
          <Text style={styles.statValue}>
            {entry.grams} <Text style={styles.statUnit}>g</Text>
          </Text>
          <Text style={styles.statFoot}>
            {t('mealDetail.time')} {entry.time}
          </Text>
        </Card>
      </View>

      <SectionTitle style={styles.section} title={t('mealDetail.macros')} />
      <Card style={styles.card}>
        <Text style={styles.statLabel}>{t('mealDetail.split')}</Text>
        <View style={styles.split}>
          {macros.map((m) => (
            <View key={m.label} style={{ flex: Math.max(m.kcal, 0.001), backgroundColor: m.color }} />
          ))}
        </View>
        {macros.map((m, i) => (
          <View key={m.label}>
            {i > 0 && <Divider />}
            <View style={styles.macroRow}>
              <View style={[styles.dot, { backgroundColor: m.color }]} />
              <Text style={styles.macroName}>{m.label}</Text>
              <Text style={styles.macroPct}>{Math.round((m.kcal / kcalSum) * 100)}%</Text>
              <Text style={styles.macroG}>{formatNumber(m.g, 1)} g</Text>
            </View>
          </View>
        ))}
        <Divider />
        <View style={styles.macroRow}>
          <Text style={[styles.macroName, { marginLeft: 0 }]}>{t('mealDetail.fiber')}</Text>
          <Text style={styles.macroG}>{formatNumber(n.fiber, 1)} g</Text>
        </View>
        <Divider />
        <View style={styles.macroRow}>
          <Text style={[styles.macroName, { marginLeft: 0 }]}>{t('mealDetail.sugar')}</Text>
          <Text style={styles.macroG}>{formatNumber(n.sugar, 1)} g</Text>
        </View>
      </Card>

      <SectionTitle style={styles.section} title={t('mealDetail.per100')} />
      <Card style={styles.per100}>
        {[
          ['kcal', String(food.kcal)],
          [t('macro.protein'), `${food.protein} g`],
          [t('macro.carbs'), `${food.carbs} g`],
          [t('macro.fat'), `${food.fat} g`],
        ].map(([k, v]) => (
          <View key={k} style={styles.per100Item}>
            <Text style={styles.statLabel}>{k}</Text>
            <Text style={styles.per100Value}>{v}</Text>
          </View>
        ))}
      </Card>

      <Button label={t('mealDetail.remove')} variant="danger" icon={TrashIcon} onPress={() => setConfirm(true)} style={styles.section} />

      <ConfirmSheet
        visible={confirm}
        title={t('mealDetail.remove')}
        body={L(food.name)}
        confirmLabel={t('common.delete')}
        destructive
        onCancel={() => setConfirm(false)}
        onConfirm={() => {
          setConfirm(false);
          router.back();
          deleteMeal(entry.id);
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...type.display, fontSize: 28, lineHeight: 32, color: colors.textPrimary, marginTop: space.sm },
  sub: { ...type.body, color: colors.textSecondary, marginTop: space.xs },
  stats: { flexDirection: 'row', gap: space.md, marginTop: space.xl },
  stat: { flex: 1, gap: 4 },
  statLabel: { ...type.caption, color: colors.textSecondary },
  statValue: { fontFamily: fonts.bold, fontSize: 26, color: colors.textPrimary },
  statUnit: { fontFamily: fonts.medium, fontSize: 14, color: colors.textSecondary },
  statFoot: { ...type.caption, color: colors.textSecondary },
  section: { marginTop: space.xxl },
  card: { marginTop: space.md, gap: space.xs },
  split: { flexDirection: 'row', height: 10, borderRadius: radius.pill, overflow: 'hidden', gap: 2, marginVertical: space.sm },
  macroRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: space.md },
  dot: { width: 10, height: 10, borderRadius: 5 },
  macroName: { ...type.body, color: colors.textPrimary, flex: 1, marginLeft: space.md },
  macroPct: { ...type.caption, color: colors.textSecondary, width: 48, textAlign: 'right' },
  macroG: { fontFamily: fonts.semibold, fontSize: 16, color: colors.textPrimary, width: 72, textAlign: 'right', fontVariant: ['tabular-nums'] },
  per100: { marginTop: space.md, flexDirection: 'row', justifyContent: 'space-between' },
  per100Item: { gap: 4 },
  per100Value: { fontFamily: fonts.semibold, fontSize: 16, color: colors.textPrimary },
});
