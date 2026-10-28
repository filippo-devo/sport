import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CaretRightIcon } from '../components/icons';
import { Divider, ProgressBar } from '../components/ui/controls';
import { NavBar } from '../components/ui/headers';
import { Screen } from '../components/ui/layout';
import { useT } from '../i18n';
import { dayKey, fromKey } from '../lib/date';
import { useStore } from '../store';
import { mealsOn, sumNutrients } from '../store/derived';
import { useUi } from '../store/ui';
import { colors, fonts, space, type } from '../theme/tokens';

/** Every logged day, newest first: kcal vs goal and macros. Tapping opens that day in Food. */
export default function FoodHistory() {
  const { t, dateLong } = useT();
  const meals = useStore((s) => s.meals);
  const goals = useStore((s) => s.goals);
  const setDate = useUi((s) => s.setFoodDate);
  const days = [...new Set(meals.map((m) => m.date))].sort().reverse();
  const today = dayKey();

  return (
    <Screen top={<NavBar title={t('food.historyTitle')} />}>
      {days.length === 0 && <Text style={styles.empty}>{t('food.nothing')}</Text>}
      {days.map((key, i) => {
        const n = sumNutrients(mealsOn(meals, key));
        const ratio = n.kcal / goals.kcal;
        const onTarget = ratio >= 0.9 && ratio <= 1.1;
        return (
          <View key={key}>
            {i > 0 && <Divider />}
            <Pressable
              style={styles.row}
              accessibilityRole="button"
              onPress={() => {
                setDate(key);
                router.back();
              }}
            >
              <View style={{ flex: 1, gap: space.xs }}>
                <View style={styles.head}>
                  <Text style={styles.date} numberOfLines={1}>
                    {key === today ? t('common.today') : dateLong(fromKey(key))}
                  </Text>
                  <Text style={[styles.kcal, onTarget && { color: colors.success }]}>
                    {Math.round(n.kcal)} <Text style={styles.goal}>/ {goals.kcal}</Text>
                  </Text>
                </View>
                <ProgressBar value={ratio} color={ratio > 1.1 ? colors.protein : colors.accent} />
                <Text style={styles.macros}>
                  <Text style={{ color: colors.protein }}>{t('macro.p')} {Math.round(n.protein)} g</Text>
                  {'   '}
                  <Text style={{ color: colors.carbs }}>{t('macro.c')} {Math.round(n.carbs)} g</Text>
                  {'   '}
                  <Text style={{ color: colors.fat }}>{t('macro.f')} {Math.round(n.fat)} g</Text>
                </Text>
              </View>
              <CaretRightIcon size={16} color={colors.textSecondary} weight="bold" />
            </Pressable>
          </View>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  empty: { ...type.body, color: colors.textSecondary, textAlign: 'center', marginTop: space.xxxl },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.lg },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: space.md },
  date: { ...type.itemTitle, color: colors.textPrimary, textTransform: 'capitalize', flexShrink: 1 },
  kcal: { fontFamily: fonts.semibold, fontSize: 16, color: colors.textPrimary },
  goal: { fontFamily: fonts.regular, fontSize: 13, color: colors.textSecondary },
  macros: { ...type.caption },
});
