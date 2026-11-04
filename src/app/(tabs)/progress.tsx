import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ClockCounterClockwiseIcon } from '../../components/icons';
import { LogWeightSheet } from '../../components/LogWeightSheet';
import { BodySection } from '../../components/progress/Body';
import { MonthCalendar } from '../../components/progress/MonthCalendar';
import { rangeStart, type Range } from '../../components/progress/range';
import { RecordsRail, StrengthList } from '../../components/progress/Strength';
import { ProgressSummary } from '../../components/progress/Summary';
import { ProgressTrends } from '../../components/progress/Trends';
import { BarChart, ChartHeadline } from '../../components/ui/charts';
import { Card, IconButton, Segmented, SectionTitle } from '../../components/ui/controls';
import { TabHeader } from '../../components/ui/headers';
import { Screen, useLayout } from '../../components/ui/layout';
import { useT } from '../../i18n';
import { addDays, dayKey, startOfDay } from '../../lib/date';
import { useStore } from '../../store';
import { mealsOn, sumNutrients } from '../../store/derived';
import { colors, space } from '../../theme/tokens';

export default function ProgressScreen() {
  const { t } = useT();
  const { gutter } = useLayout();
  const meals = useStore((s) => s.meals);
  const goals = useStore((s) => s.goals);
  const [range, setRange] = useState<Range>('month');
  const [weightOpen, setWeightOpen] = useState(false);
  const since = rangeStart(range).getTime();

  const calorieDays = Array.from({ length: 14 }, (_, i) => addDays(startOfDay(), i - 13));
  const calories = calorieDays.map((d) => sumNutrients(mealsOn(meals, dayKey(d))).kcal);
  const logged = calories.filter((c) => c > 0);

  return (
    <Screen tabBar>
      <TabHeader title={t('progress.title')} right={<IconButton icon={ClockCounterClockwiseIcon} label={t('progress.history')} onPress={() => router.push('/history')} />} />
      <View style={styles.range}>
        <Segmented
          value={range}
          onChange={setRange}
          options={[
            { value: 'week', label: t('progress.rangeWeek') },
            { value: 'month', label: t('progress.rangeMonth') },
            { value: '3m', label: t('progress.range3m') },
            { value: 'year', label: t('progress.rangeYear') },
          ]}
        />
      </View>

      <ProgressSummary />

      <SectionTitle style={styles.section} title={t('progress.trends')} />
      <ProgressTrends range={range} />

      <MonthCalendar />
      <StrengthList since={since} />
      <RecordsRail since={since} />
      <BodySection since={since} onLogWeight={() => setWeightOpen(true)} />

      <SectionTitle style={styles.section} title={t('progress.calories')} aside={t('progress.last14')} />
      <Card style={styles.card}>
        <ChartHeadline
          value={logged.length ? t('progress.avg', { n: Math.round(logged.reduce((a, b) => a + b, 0) / logged.length) }) : '—'}
          caption={`${t('progress.caloriesSub')} · ${t('progress.goal')} ${goals.kcal} kcal`}
        />
        <BarChart values={calories} goal={goals.kcal} color={colors.accent} labels={calorieDays.map((d, i) => (i % 3 === 1 || i === 13 ? String(d.getDate()) : ''))} />
      </Card>
      <View style={{ height: gutter }} />

      <LogWeightSheet visible={weightOpen} onClose={() => setWeightOpen(false)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  range: { marginTop: space.lg },
  section: { marginTop: space.xxl + space.xxs },
  card: { marginTop: space.md, gap: space.md },
});
