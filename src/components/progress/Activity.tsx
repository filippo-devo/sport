import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useT } from '../../i18n';
import { addDays, startOfDay } from '../../lib/date';
import { formatNumber, formatVolume } from '../../lib/units';
import { useStore } from '../../store';
import { monthCalendar, type MonthDay } from '../../store/progress';
import { activeDays, dayStreak, goalProgress, goalWeekStreak, periodTotals, regularity, startOfMonth, workoutsPerWeek } from '../../store/stats';
import { colors, fonts, radius, space, statusColor, type } from '../../theme/tokens';
import { CalendarCheckIcon, CaretLeftIcon, CaretRightIcon, ChartLineUpIcon, FireIcon } from '../icons';
import { BarChart, ChartHeadline } from '../ui/charts';
import { Card, IconButton, SectionTitle } from '../ui/controls';
import { Ring } from '../ui/Ring';

const CHART_WEEKS = 8;

const useLog = () => {
  const sessions = useStore((s) => s.sessions);
  const meals = useStore((s) => s.meals);
  const water = useStore((s) => s.water);
  const supplementLogs = useStore((s) => s.supplementLogs);
  return useMemo(() => ({ sessions, meals, water, supplementLogs }), [sessions, meals, water, supplementLogs]);
};

/** Weekly and monthly goal rings plus workouts per week. */
export function ActivitySection() {
  const { t, dateShort } = useT();
  const sessions = useStore((s) => s.sessions);
  const goals = useStore((s) => s.goals);
  const stats = useMemo(() => ({ goals: goalProgress(sessions, goals), perWeek: workoutsPerWeek(sessions, CHART_WEEKS) }), [sessions, goals]);
  const avgPerWeek = stats.perWeek.slice(0, -1).reduce((n, w) => n + w.count, 0) / Math.max(1, CHART_WEEKS - 1);

  return (
    <View>
      <SectionTitle style={styles.section} title={t('progress.activity')} aside={t('stats.editGoals')} onAside={() => router.push('/profile')} />
      <Card style={styles.card}>
        <View style={styles.goals}>
          <GoalRing label={t('stats.weekGoal')} {...stats.goals.week} />
          <View style={styles.vline} />
          <GoalRing label={t('stats.monthGoal')} {...stats.goals.month} />
        </View>
        <View style={styles.hline} />
        <ChartHeadline value={t('stats.avgPerWeek', { n: formatNumber(avgPerWeek, 1) })} caption={`${t('stats.perWeek')} · ${t('stats.lastWeeks', { n: CHART_WEEKS })}`} />
        <BarChart
          values={stats.perWeek.map((w) => w.count)}
          goal={goals.workoutsPerWeek}
          goalMode="min"
          color={colors.success}
          height={110}
          labels={stats.perWeek.map((w, i) => (i % 2 === 1 || i === CHART_WEEKS - 1 ? dateShort(w.week) : ''))}
        />
      </Card>
    </View>
  );
}

/** Streak card next to the monthly report. */
export function StreakAndMonth() {
  const { t, tn, monthYear } = useT();
  const log = useLog();
  const goals = useStore((s) => s.goals);
  const units = useStore((s) => s.settings.units);

  const stats = useMemo(() => {
    const now = new Date();
    const month = startOfMonth(now);
    const prevMonth = new Date(month.getFullYear(), month.getMonth() - 1, 1);
    // Same number of days into last month, so the comparison is fair mid-month.
    const prevEnd = Math.min(month.getTime(), addDays(prevMonth, now.getDate()).getTime());
    return {
      streak: goalWeekStreak(log.sessions, goals.workoutsPerWeek, now),
      days: dayStreak(activeDays(log), now),
      regularity: regularity(log.sessions, goals.workoutsPerWeek, 4, now),
      month: periodTotals(log.sessions, month.getTime(), addDays(startOfDay(now), 1).getTime()),
      prevMonth: periodTotals(log.sessions, prevMonth.getTime(), prevEnd),
    };
  }, [log, goals]);
  const diff = stats.month.workouts - stats.prevMonth.workouts;

  return (
    <View style={styles.pair}>
      <Card style={styles.half}>
        <View style={styles.halfHead}>
          <FireIcon size={16} color={colors.accent} weight="fill" />
          <Text style={styles.halfLabel}>{t('progress.streak')}</Text>
        </View>
        <Text style={styles.big} numberOfLines={1} adjustsFontSizeToFit>
          {tn('unit.weeks', stats.streak.current)}
        </Text>
        <Text style={styles.small}>{t('progress.streakSub')}</Text>
        <Text style={styles.small}>{t('stats.best', { n: stats.streak.best })}</Text>
        <View style={styles.halfFoot}>
          <View style={styles.footRow}>
            <CalendarCheckIcon size={14} color={colors.success} weight="fill" />
            <Text style={styles.footText} numberOfLines={2}>
              {t('progress.activeRow', { days: tn('unit.days', stats.days) })}
            </Text>
          </View>
          {stats.regularity != null && (
            <View style={styles.footRow}>
              <ChartLineUpIcon size={14} color={statusColor(stats.regularity * 100)} weight="bold" />
              <Text style={styles.footText}>
                {t('stats.regularity')} {Math.round(stats.regularity * 100)}%
              </Text>
            </View>
          )}
        </View>
      </Card>

      <Card style={styles.half}>
        <Text style={styles.halfLabel}>{t('progress.monthly')}</Text>
        <Text style={styles.monthName}>{monthYear(new Date())}</Text>
        <MonthStat value={String(stats.month.workouts)} label={t('stats.workouts')} />
        <MonthStat value={String(stats.month.minutes)} label={t('stats.minutes')} />
        <MonthStat value={formatVolume(stats.month.volume, units)} label={t('stats.volume')} />
        <Text style={[styles.small, { color: diff > 0 ? colors.success : colors.textSecondary, marginTop: 'auto' }]}>
          {stats.prevMonth.workouts === 0 && stats.month.workouts === 0
            ? t('stats.monthEmpty')
            : t('stats.vsLastMonth', { d: `${diff > 0 ? '+' : diff < 0 ? '−' : '±'}${Math.abs(diff)}` })}
        </Text>
      </Card>
    </View>
  );
}

/** Month grid with day numbers; workout days in the accent colour. */
export function ActivityCalendar() {
  const { t, tn, dateShort, monthYear, weekdayShort } = useT();
  const log = useLog();
  const units = useStore((s) => s.settings.units);
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [picked, setPicked] = useState<MonthDay | null>(null);
  const weeks = useMemo(() => monthCalendar(log, month), [log, month]);
  const isCurrent = startOfMonth(new Date()).getTime() === month.getTime();
  const shift = (n: number) => {
    setPicked(null);
    setMonth(new Date(month.getFullYear(), month.getMonth() + n, 1));
  };
  const days = weeks.flat().filter((d): d is MonthDay => !!d);
  const maxVolume = Math.max(1, ...days.map((d) => d.volume));
  const monthWorkouts = days.reduce((n, d) => n + d.workouts, 0);
  const header = Array.from({ length: 7 }, (_, i) => addDays(new Date(2024, 0, 1), i)); // 1 Jan 2024 was a Monday

  return (
    <View>
      <SectionTitle style={styles.section} title={t('progress.calendar')} aside={tn('unit.workouts', monthWorkouts)} />
      <Card style={styles.card}>
        <View style={styles.calNav}>
          <IconButton icon={CaretLeftIcon} label={t('progress.prevMonth')} size={34} tone="surface" iconColor={colors.textPrimary} onPress={() => shift(-1)} />
          <Text style={styles.calTitle}>{monthYear(month)}</Text>
          <IconButton
            icon={CaretRightIcon}
            label={t('progress.nextMonth')}
            size={34}
            tone="surface"
            iconColor={isCurrent ? colors.track : colors.textPrimary}
            onPress={() => !isCurrent && shift(1)}
          />
        </View>
        <View style={styles.week}>
          {header.map((d) => (
            <Text key={d.getDay()} style={styles.weekday}>
              {weekdayShort(d).slice(0, 2)}
            </Text>
          ))}
        </View>
        <View style={{ gap: 5 }}>
          {weeks.map((week, w) => (
            <View key={w} style={styles.week}>
              {week.map((d, i) =>
                d ? (
                  <Pressable
                    key={d.key}
                    disabled={d.future}
                    onPress={() => setPicked(picked?.key === d.key ? null : d)}
                    style={[styles.day, { backgroundColor: dayColor(d, maxVolume) }, d.today && styles.dayToday, picked?.key === d.key && styles.dayPicked]}
                    accessibilityRole="button"
                    accessibilityLabel={`${dateShort(d.date)}: ${tn('unit.workouts', d.workouts)}`}
                  >
                    <Text style={[styles.dayText, d.workouts > 0 && { color: colors.textOnAccent, fontFamily: fonts.bold }, d.future && { color: colors.track }]}>{d.day}</Text>
                  </Pressable>
                ) : (
                  <View key={`e${i}`} style={styles.dayEmpty} />
                ),
              )}
            </View>
          ))}
        </View>
        <View style={styles.legend}>
          <Legend color={colors.track} label={t('stats.legendNone')} />
          <Legend color="rgba(170,183,196,0.45)" label={t('stats.legendActive')} />
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

function dayColor(d: MonthDay, maxVolume: number) {
  if (d.future) return 'transparent';
  if (d.workouts > 0) {
    // Brighter for heavier days; bodyweight-only days still show clearly.
    const k = d.volume > 0 ? 0.55 + 0.45 * (d.volume / maxVolume) : 0.7;
    return `rgba(210,254,8,${k.toFixed(2)})`;
  }
  return d.active ? 'rgba(170,183,196,0.45)' : colors.surfaceAccent;
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

function MonthStat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.monthStat}>
      <Text style={styles.monthValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={styles.small}>{label}</Text>
    </View>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.small}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: space.xxl + space.xxs },
  card: { marginTop: space.md, gap: space.md },
  goals: { flexDirection: 'row', alignItems: 'center', paddingVertical: space.xs },
  vline: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch', backgroundColor: colors.hairline },
  hline: { height: StyleSheet.hairlineWidth, backgroundColor: colors.hairline },
  goal: { flex: 1, alignItems: 'center', gap: space.sm },
  goalBig: { fontFamily: fonts.bold, fontSize: 20, color: colors.textPrimary },
  goalOf: { fontFamily: fonts.medium, fontSize: 13, color: colors.textSecondary },
  goalLabel: { ...type.caption, color: colors.textPrimary, fontFamily: fonts.semibold },

  pair: { flexDirection: 'row', gap: space.sm, marginTop: space.md },
  half: { flex: 1, padding: space.md, gap: 2 },
  halfHead: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  halfLabel: { ...type.caption, fontFamily: fonts.semibold, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.6 },
  big: { fontFamily: fonts.bold, fontSize: 24, color: colors.textPrimary, marginTop: space.xs },
  small: { ...type.caption, fontSize: 11, color: colors.textSecondary },
  halfFoot: { marginTop: space.sm, paddingTop: space.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.hairline, gap: space.xs },
  footRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  footText: { ...type.caption, color: colors.textPrimary, flex: 1 },
  monthName: { ...type.body, fontFamily: fonts.semibold, color: colors.textPrimary, textTransform: 'capitalize', marginTop: space.xs },
  monthStat: { marginTop: space.xs },
  monthValue: { fontFamily: fonts.bold, fontSize: 18, color: colors.textPrimary },

  calNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  calTitle: { ...type.itemTitle, fontFamily: fonts.semibold, color: colors.textPrimary, textTransform: 'capitalize' },
  week: { flexDirection: 'row', gap: 5 },
  weekday: { flex: 1, textAlign: 'center', ...type.caption, fontSize: 11, color: colors.textSecondary },
  day: { flex: 1, aspectRatio: 1, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  dayEmpty: { flex: 1, aspectRatio: 1 },
  dayToday: { borderWidth: 1.5, borderColor: colors.textPrimary },
  dayPicked: { borderWidth: 2.5, borderColor: colors.textPrimary },
  dayText: { fontFamily: fonts.medium, fontSize: 14, color: colors.textPrimary, fontVariant: ['tabular-nums'] },
  legend: { flexDirection: 'row', gap: space.md, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 10, height: 10, borderRadius: 3 },
  picked: { flexDirection: 'row', gap: space.sm, alignItems: 'baseline', paddingTop: space.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.hairline },
  pickedDate: { fontFamily: fonts.semibold, fontSize: 14, color: colors.textPrimary },
  pickedText: { ...type.caption, color: colors.textSecondary, flex: 1 },
});
