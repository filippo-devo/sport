import { router } from 'expo-router';
import { useMemo, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useT } from '../../i18n';
import { addDays, dayKey, startOfDay } from '../../lib/date';
import { formatNumber, formatVolume } from '../../lib/units';
import { useStore } from '../../store';
import { activeDays, activityCalendar, dayStreak, goalProgress, goalWeekStreak, periodTotals, regularity, startOfMonth, workoutsPerWeek, type CalendarDay } from '../../store/stats';
import { colors, fonts, space, statusColor, type } from '../../theme/tokens';
import { CalendarCheckIcon, FireIcon, TargetIcon } from '../icons';
import { BarChart, ChartHeadline } from '../ui/charts';
import { Card, SectionTitle } from '../ui/controls';
import { Ring } from '../ui/Ring';

const CAL_WEEKS = 13;
const CHART_WEEKS = 8;

/** Goals, streaks, regularity, workouts per week and the activity calendar — all from the log. */
export function ProgressOverview() {
  const { t, tn, weekdayShort, dateShort, monthYear } = useT();
  const sessions = useStore((s) => s.sessions);
  const meals = useStore((s) => s.meals);
  const water = useStore((s) => s.water);
  const supplementLogs = useStore((s) => s.supplementLogs);
  const goals = useStore((s) => s.goals);
  const units = useStore((s) => s.settings.units);
  const [picked, setPicked] = useState<CalendarDay | null>(null);

  const stats = useMemo(() => {
    const now = new Date();
    const log = { sessions, meals, water, supplementLogs };
    const month = startOfMonth(now);
    const prevMonth = new Date(month.getFullYear(), month.getMonth() - 1, 1);
    // Same number of days into last month, so the comparison is fair mid-month.
    const prevEnd = Math.min(month.getTime(), addDays(prevMonth, now.getDate()).getTime());
    return {
      goals: goalProgress(sessions, goals, now),
      streak: goalWeekStreak(sessions, goals.workoutsPerWeek, now),
      days: dayStreak(activeDays(log), now),
      regularity: regularity(sessions, goals.workoutsPerWeek, 4, now),
      perWeek: workoutsPerWeek(sessions, CHART_WEEKS, now),
      calendar: activityCalendar(log, CAL_WEEKS, now),
      month: periodTotals(sessions, month.getTime(), addDays(startOfDay(now), 1).getTime()),
      prevMonth: periodTotals(sessions, prevMonth.getTime(), prevEnd),
    };
  }, [sessions, meals, water, supplementLogs, goals]);

  const maxVolume = Math.max(1, ...stats.calendar.flat().map((d) => d.volume));
  const avgPerWeek = stats.perWeek.slice(0, -1).reduce((n, w) => n + w.count, 0) / Math.max(1, CHART_WEEKS - 1);
  const diff = stats.month.workouts - stats.prevMonth.workouts;

  return (
    <View>
      {/* Weekly / monthly goals */}
      <SectionTitle style={styles.first} title={t('stats.goals')} aside={t('stats.editGoals')} onAside={() => router.push('/profile')} />
      <Card style={styles.goals}>
        <GoalRing label={t('stats.weekGoal')} done={stats.goals.week.done} goal={stats.goals.week.goal} ratio={stats.goals.week.ratio} />
        <View style={styles.vline} />
        <GoalRing label={t('stats.monthGoal')} done={stats.goals.month.done} goal={stats.goals.month.goal} ratio={stats.goals.month.ratio} />
      </Card>

      {/* Streaks and regularity */}
      <View style={styles.tiles}>
        <Tile icon={<FireIcon size={16} color={colors.accent} weight="fill" />} label={t('stats.weekStreak')} value={tn('unit.weeks', stats.streak.current)} sub={t('stats.best', { n: stats.streak.best })} />
        <Tile icon={<CalendarCheckIcon size={16} color={colors.success} weight="fill" />} label={t('stats.dayStreak')} value={tn('unit.days', stats.days)} sub={t('stats.dayStreakSub')} />
        <Tile
          icon={<TargetIcon size={16} color={stats.regularity == null ? colors.textSecondary : statusColor(stats.regularity * 100)} weight="fill" />}
          label={t('stats.regularity')}
          value={stats.regularity == null ? '—' : `${Math.round(stats.regularity * 100)}%`}
          sub={t('stats.regularitySub')}
        />
      </View>

      {/* Workouts per week */}
      <SectionTitle style={styles.section} title={t('stats.perWeek')} aside={t('stats.lastWeeks', { n: CHART_WEEKS })} />
      <Card style={styles.card}>
        <ChartHeadline value={t('stats.avgPerWeek', { n: formatNumber(avgPerWeek, 1) })} caption={`${t('progress.goal')} ${goals.workoutsPerWeek} / ${t('stats.week')}`} />
        <BarChart
          values={stats.perWeek.map((w) => w.count)}
          goal={goals.workoutsPerWeek}
          goalMode="min"
          color={colors.success}
          labels={stats.perWeek.map((w, i) => (i % 2 === 1 || i === CHART_WEEKS - 1 ? dateShort(w.week) : ''))}
        />
      </Card>

      {/* This month */}
      <Card style={[styles.card, styles.month]}>
        <Text style={styles.monthTitle}>{monthYear(new Date())}</Text>
        <View style={styles.monthRow}>
          <MonthStat value={String(stats.month.workouts)} label={t('stats.workouts')} />
          <MonthStat value={String(stats.month.minutes)} label={t('stats.minutes')} />
          <MonthStat value={formatVolume(stats.month.volume, units)} label={t('stats.volume')} />
        </View>
        <Text style={[styles.monthDiff, { color: diff > 0 ? colors.success : colors.textSecondary }]}>
          {stats.prevMonth.workouts === 0 && stats.month.workouts === 0
            ? t('stats.monthEmpty')
            : t('stats.vsLastMonth', { d: `${diff > 0 ? '+' : diff < 0 ? '−' : '±'}${Math.abs(diff)}` })}
        </Text>
      </Card>

      {/* Activity calendar */}
      <SectionTitle style={styles.section} title={t('stats.activity')} aside={t('stats.lastWeeks', { n: CAL_WEEKS })} />
      <Card style={styles.card}>
        <View style={styles.calendar}>
          <View style={styles.calLabels}>
            {stats.calendar[0].map((d, i) => (
              <Text key={d.key} style={styles.calLabel}>
                {i % 2 === 0 ? weekdayShort(d.date).slice(0, 2) : ''}
              </Text>
            ))}
          </View>
          {stats.calendar.map((week) => (
            <View key={week[0].key} style={styles.calCol}>
              {week.map((d) => (
                <Pressable
                  key={d.key}
                  disabled={d.future}
                  onPress={() => setPicked(picked?.key === d.key ? null : d)}
                  style={[styles.cell, { backgroundColor: cellColor(d, maxVolume) }, picked?.key === d.key && styles.cellPicked, d.key === dayKey() && styles.cellToday]}
                  accessibilityRole="button"
                  accessibilityLabel={`${dateShort(d.date)}: ${tn('unit.workouts', d.workouts)}`}
                />
              ))}
            </View>
          ))}
        </View>
        <View style={styles.legend}>
          <Legend color={colors.track} label={t('stats.legendNone')} />
          <Legend color="rgba(170,183,196,0.62)" label={t('stats.legendActive')} />
          <Legend color={colors.accent} label={t('stats.legendWorkout')} />
        </View>
        {picked && (
          <Pressable
            style={styles.picked}
            onPress={() => picked.workouts > 0 && router.push('/history')}
            disabled={picked.workouts === 0}
            accessibilityRole={picked.workouts > 0 ? 'button' : undefined}
          >
            <Text style={styles.pickedDate}>{dateShort(picked.date)}</Text>
            <Text style={styles.pickedText}>
              {picked.workouts > 0
                ? `${tn('unit.workouts', picked.workouts)} · ${formatVolume(picked.volume, units)}`
                : picked.active
                  ? t('stats.dayLoggedOnly')
                  : t('stats.dayNothing')}
            </Text>
          </Pressable>
        )}
      </Card>
    </View>
  );
}

function cellColor(d: CalendarDay, maxVolume: number) {
  if (d.future) return 'transparent';
  if (d.workouts > 0) {
    // Brighter for heavier days; bodyweight-only days still show clearly.
    const k = d.volume > 0 ? 0.45 + 0.55 * (d.volume / maxVolume) : 0.6;
    return `rgba(210,254,8,${k.toFixed(2)})`;
  }
  return d.active ? 'rgba(170,183,196,0.62)' : colors.track;
}

function GoalRing({ label, done, goal, ratio }: { label: string; done: number; goal: number; ratio: number }) {
  const met = done >= goal && goal > 0;
  return (
    <View style={styles.goal} accessible accessibilityLabel={`${label}: ${done} / ${goal}`}>
      <Ring value={ratio} size={72} stroke={7} color={met ? colors.success : colors.accent}>
        <Text style={styles.goalBig}>
          {done}
          <Text style={styles.goalOf}>/{goal}</Text>
        </Text>
      </Ring>
      <Text style={styles.goalLabel}>{label}</Text>
    </View>
  );
}

function Tile({ icon, label, value, sub }: { icon: ReactNode; label: string; value: string; sub: string }) {
  return (
    <Card style={styles.tile}>
      <View style={styles.tileHead}>
        {icon}
        <Text style={styles.tileLabel} numberOfLines={1}>
          {label}
        </Text>
      </View>
      <Text style={styles.tileValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={styles.tileSub} numberOfLines={2}>
        {sub}
      </Text>
    </Card>
  );
}

function MonthStat({ value, label }: { value: string; label: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.monthValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={styles.tileSub}>{label}</Text>
    </View>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.tileSub}>{label}</Text>
    </View>
  );
}

const CELL = 14;

const styles = StyleSheet.create({
  first: { marginTop: space.xl },
  section: { marginTop: space.xxl + space.xxs },
  card: { marginTop: space.md, gap: space.md },
  goals: { marginTop: space.md, flexDirection: 'row', alignItems: 'center', paddingVertical: space.lg },
  vline: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch', backgroundColor: colors.hairline },
  goal: { flex: 1, alignItems: 'center', gap: space.sm },
  goalBig: { fontFamily: fonts.bold, fontSize: 20, color: colors.textPrimary },
  goalOf: { fontFamily: fonts.medium, fontSize: 13, color: colors.textSecondary },
  goalLabel: { ...type.caption, color: colors.textPrimary, fontFamily: fonts.semibold },
  tiles: { flexDirection: 'row', gap: space.sm, marginTop: space.md },
  tile: { flex: 1, padding: space.md, gap: 2 },
  tileHead: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  tileLabel: { ...type.caption, color: colors.textSecondary, flex: 1 },
  tileValue: { fontFamily: fonts.bold, fontSize: 18, color: colors.textPrimary, marginTop: space.xs },
  tileSub: { ...type.caption, fontSize: 11, color: colors.textSecondary },
  month: { gap: space.sm },
  monthTitle: { ...type.itemTitle, fontFamily: fonts.semibold, color: colors.textPrimary, textTransform: 'capitalize' },
  monthRow: { flexDirection: 'row', gap: space.md },
  monthValue: { fontFamily: fonts.bold, fontSize: 20, color: colors.textPrimary },
  monthDiff: { ...type.caption },
  calendar: { flexDirection: 'row', justifyContent: 'space-between' },
  calLabels: { gap: 4, marginRight: 2 },
  calLabel: { height: CELL, lineHeight: CELL, fontSize: 9, fontFamily: fonts.medium, color: colors.textSecondary, width: 16 },
  calCol: { gap: 4 },
  cell: { width: CELL, height: CELL, borderRadius: 3 },
  cellToday: { borderWidth: 1, borderColor: colors.textPrimary },
  cellPicked: { borderWidth: 2, borderColor: colors.textPrimary },
  legend: { flexDirection: 'row', gap: space.md, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 10, height: 10, borderRadius: 2 },
  picked: { flexDirection: 'row', gap: space.sm, alignItems: 'baseline', paddingTop: space.xs, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.hairline },
  pickedDate: { fontFamily: fonts.semibold, fontSize: 14, color: colors.textPrimary },
  pickedText: { ...type.caption, color: colors.textSecondary, flex: 1 },
});
