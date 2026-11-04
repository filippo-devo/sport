import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useT } from '../../i18n';
import { addDays, dayKey, startOfWeek } from '../../lib/date';
import { formatVolume } from '../../lib/units';
import { useStore } from '../../store';
import { sessionVolume } from '../../store/derived';
import { activeDays, periodTotals } from '../../store/stats';
import { colors, fonts, space, type } from '../../theme/tokens';
import { CaretLeftIcon, CaretRightIcon } from '../icons';
import { Card, SectionTitle } from '../ui/controls';

type Day = { key: string; date: Date; workouts: number; volume: number; active: boolean };

/** Month grid with training days filled, arrows to earlier months and that month's totals. */
export function MonthCalendar() {
  const { t, tn, weekdayShort, monthYear, dateShort } = useT();
  const sessions = useStore((s) => s.sessions);
  const meals = useStore((s) => s.meals);
  const water = useStore((s) => s.water);
  const supplementLogs = useStore((s) => s.supplementLogs);
  const units = useStore((s) => s.settings.units);
  const [offset, setOffset] = useState(0);
  const [picked, setPicked] = useState<Day | null>(null);

  const now = new Date();
  const month = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const next = new Date(month.getFullYear(), month.getMonth() + 1, 1);
  const today = dayKey(now);

  const { weeks, totals } = useMemo(() => {
    const active = activeDays({ sessions, meals, water, supplementLogs });
    const byDay = new Map<string, number[]>();
    for (const s of sessions) {
      const k = dayKey(s.startedAt);
      byDay.set(k, [...(byDay.get(k) ?? []), sessionVolume(s)]);
    }
    const first = startOfWeek(month);
    const rows: (Day | null)[][] = [];
    for (let w = first; w < next; w = addDays(w, 7)) {
      rows.push(
        Array.from({ length: 7 }, (_, i) => {
          const date = addDays(w, i);
          if (date.getMonth() !== month.getMonth()) return null;
          const key = dayKey(date);
          const v = byDay.get(key) ?? [];
          return { key, date, workouts: v.length, volume: v.reduce((a, b) => a + b, 0), active: active.has(key) };
        }),
      );
    }
    return { weeks: rows, totals: periodTotals(sessions, month.getTime(), next.getTime()) };
    // month/next derive from offset
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessions, meals, water, supplementLogs, offset]);

  const go = (d: number) => {
    setPicked(null);
    setOffset((o) => Math.min(0, o + d));
  };

  return (
    <View>
      <View style={styles.titleRow}>
        <SectionTitle style={{ flex: 1 }} title={t('progress.calendar')} />
        <View style={styles.nav}>
          <Pressable onPress={() => go(-1)} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('progress.prevMonth')} style={styles.navBtn}>
            <CaretLeftIcon size={16} color={colors.textPrimary} weight="bold" />
          </Pressable>
          <Text style={styles.month}>{monthYear(month)}</Text>
          <Pressable
            onPress={() => go(1)}
            disabled={offset === 0}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t('progress.nextMonth')}
            style={[styles.navBtn, offset === 0 && { opacity: 0.3 }]}
          >
            <CaretRightIcon size={16} color={colors.textPrimary} weight="bold" />
          </Pressable>
        </View>
      </View>
      <Card style={styles.card}>
        <View style={styles.row}>
          {(weeks[0] ?? []).map((_, i) => (
            <Text key={i} style={styles.wd}>
              {weekdayShort(addDays(startOfWeek(now), i)).slice(0, 2)}
            </Text>
          ))}
        </View>
        {weeks.map((row, r) => (
          <View key={r} style={styles.row}>
            {row.map((d, i) =>
              d ? (
                <Pressable
                  key={d.key}
                  disabled={d.key > today}
                  onPress={() => setPicked(picked?.key === d.key ? null : d)}
                  style={styles.cellWrap}
                  accessibilityRole="button"
                  accessibilityLabel={`${dateShort(d.date)}: ${tn('unit.workouts', d.workouts)}`}
                >
                  <View
                    style={[
                      styles.cell,
                      d.workouts > 0 ? styles.cellWorkout : d.active ? styles.cellActive : null,
                      d.key === today && styles.cellToday,
                      picked?.key === d.key && styles.cellPicked,
                    ]}
                  >
                    <Text style={[styles.num, d.workouts > 0 && styles.numWorkout, d.key > today && { opacity: 0.4 }, (d.active || d.key === today) && d.workouts === 0 && { color: colors.textPrimary }]}>
                      {d.date.getDate()}
                    </Text>
                  </View>
                </Pressable>
              ) : (
                <View key={`e${i}`} style={styles.cellWrap} />
              ),
            )}
          </View>
        ))}
        {picked && (
          <Pressable style={styles.picked} onPress={() => picked.workouts > 0 && router.push('/history')} disabled={picked.workouts === 0}>
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
        <View style={styles.foot}>
          <Stat value={String(totals.workouts)} label={t('stats.workouts')} />
          <Stat value={`${totals.minutes} min`} label={t('stats.minutes')} />
          <Stat value={formatVolume(totals.volume, units)} label={t('stats.volume')} />
        </View>
      </Card>
    </View>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center', marginTop: space.xxl + space.xxs },
  nav: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  navBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.control, alignItems: 'center', justifyContent: 'center' },
  month: { fontFamily: fonts.semibold, fontSize: 14, color: colors.textPrimary, textTransform: 'capitalize', minWidth: 96, textAlign: 'center' },
  card: { marginTop: space.md, gap: space.xs },
  row: { flexDirection: 'row' },
  wd: { flex: 1, textAlign: 'center', ...type.caption, fontSize: 11, color: colors.textSecondary, marginBottom: space.xxs },
  cellWrap: { flex: 1, alignItems: 'center', paddingVertical: 2 },
  cell: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  cellWorkout: { backgroundColor: colors.accent },
  cellActive: { backgroundColor: colors.control },
  cellToday: { borderWidth: 2, borderColor: colors.accent },
  cellPicked: { borderWidth: 2, borderColor: colors.textPrimary },
  num: { fontFamily: fonts.medium, fontSize: 13, color: colors.textSecondary, fontVariant: ['tabular-nums'] },
  numWorkout: { fontFamily: fonts.bold, color: colors.textOnAccent },
  picked: { flexDirection: 'row', gap: space.sm, alignItems: 'baseline', paddingTop: space.sm },
  pickedDate: { fontFamily: fonts.semibold, fontSize: 14, color: colors.textPrimary },
  pickedText: { ...type.caption, color: colors.textSecondary, flex: 1 },
  foot: { flexDirection: 'row', gap: space.md, marginTop: space.sm, paddingTop: space.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.hairline },
  statValue: { fontFamily: fonts.bold, fontSize: 18, color: colors.textPrimary },
  statLabel: { ...type.caption, color: colors.textSecondary },
});
