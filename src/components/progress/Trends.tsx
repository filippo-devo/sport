import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useT } from '../../i18n';
import { formatNumber, formatVolume, toDisplayWeight } from '../../lib/units';
import { useStore } from '../../store';
import { colors, fonts, space, type } from '../../theme/tokens';
import { Card, Chip } from '../ui/controls';
import { BarChart } from '../ui/charts';
import { metricOf, rangeBuckets, rangeStart, type Metric, type Range } from './range';

/** One chart for workouts, volume or minutes over the selected range, with change vs. the previous period. */
export function ProgressTrends({ range }: { range: Range }) {
  const { t, weekdayShort, dateShort, monthShort } = useT();
  const sessions = useStore((s) => s.sessions);
  const goals = useStore((s) => s.goals);
  const units = useStore((s) => s.settings.units);
  const [metric, setMetric] = useState<Metric>('workouts');

  const data = useMemo(() => {
    const now = new Date();
    const buckets = rangeBuckets(range, now);
    const values = buckets.map((b) => metricOf(sessions, metric, b.start.getTime(), b.end.getTime()));
    const from = rangeStart(range, now).getTime();
    const to = now.getTime() + 1;
    const span = range === 'week' ? 7 * 86400000 : to - from;
    const total = metricOf(sessions, metric, from, to);
    // Same length of time right before the range (for a week: the same days of last week).
    const prev = metricOf(sessions, metric, from - span, range === 'week' ? to - span : from);
    const weeks = Math.max(1, (to - from) / (7 * 86400000));
    return { buckets, values, total, prev, perWeek: total / weeks };
  }, [sessions, metric, range]);

  const kind = data.buckets[0]?.kind;
  const labels = data.buckets.map((b, i) => {
    const n = data.buckets.length;
    if (kind === 'day') return weekdayShort(b.start).slice(0, 2);
    if (kind === 'month') return i % 2 === 1 || i === n - 1 ? monthShort(b.start) : '';
    const step = n <= 6 ? 1 : 4;
    return i === n - 1 || (n - 1 - i) % step === 0 ? dateShort(b.start) : '';
  });
  const goal = metric !== 'workouts' ? undefined : kind === 'week' ? goals.workoutsPerWeek : kind === 'month' ? goals.workoutsPerMonth : undefined;

  const pct = data.prev > 0 ? Math.round(((data.total - data.prev) / data.prev) * 100) : null;
  const headline =
    metric === 'workouts'
      ? String(data.total)
      : metric === 'volume'
        ? formatVolume(data.total, units)
        : formatNumber(data.total, 0);
  const caption =
    metric === 'workouts'
      ? range === 'week'
        ? t('progress.workoutsTotal')
        : `${t('progress.workoutsTotal')} · ${t('progress.perWeekAvg', { n: formatNumber(data.perWeek, 1) })}`
      : metric === 'volume'
        ? t('progress.volumeTotal')
        : t('progress.minutesTotal');

  return (
    <Card style={styles.card}>
      <View style={styles.chips}>
        <Chip label={t('stats.workouts')} selected={metric === 'workouts'} onPress={() => setMetric('workouts')} />
        <Chip label={t('stats.volume')} selected={metric === 'volume'} onPress={() => setMetric('volume')} />
        <Chip label={t('stats.minutes')} selected={metric === 'minutes'} onPress={() => setMetric('minutes')} />
      </View>
      <View>
        <View style={styles.headRow}>
          <Text style={styles.big}>{headline}</Text>
          {pct != null && (
            <Text style={[styles.delta, { color: pct > 0 ? colors.success : pct < 0 ? colors.danger : colors.textSecondary }]}>
              {pct > 0 ? '+' : pct < 0 ? '−' : '±'}
              {Math.abs(pct)}% {t('progress.vsPrev')}
            </Text>
          )}
        </View>
        <Text style={styles.caption}>{caption}</Text>
      </View>
      <BarChart
        values={metric === 'volume' ? data.values.map((v) => toDisplayWeight(v, units)) : data.values}
        labels={labels}
        goal={goal}
        goalMode="min"
        highlightLast={goal == null}
        format={(v) => (v >= 1000 ? `${formatNumber(v / 1000, 0)}k` : String(Math.round(v)))}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: space.md, gap: space.md },
  chips: { flexDirection: 'row', gap: space.sm },
  headRow: { flexDirection: 'row', alignItems: 'baseline', gap: space.sm, flexWrap: 'wrap' },
  big: { fontFamily: fonts.bold, fontSize: 28, lineHeight: 32, color: colors.textPrimary },
  delta: { fontFamily: fonts.semibold, fontSize: 13 },
  caption: { ...type.body, fontSize: 14, color: colors.textSecondary },
});
