import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useT } from '../../i18n';
import { dayKey, weekDays } from '../../lib/date';
import { useStore } from '../../store';
import { goalProgress, goalWeekStreak, regularity } from '../../store/stats';
import { colors, fonts, space, statusColor, type } from '../../theme/tokens';
import { CheckIcon, FireIcon } from '../icons';
import { Card } from '../ui/controls';
import { Ring } from '../ui/Ring';

/** Week ring, goal streak, month count, regularity and this week's training days in one card. */
export function ProgressSummary() {
  const { t, tn, weekdayShort } = useT();
  const sessions = useStore((s) => s.sessions);
  const goals = useStore((s) => s.goals);

  const s = useMemo(() => {
    const now = new Date();
    const trained = new Set(sessions.map((x) => dayKey(x.startedAt)));
    return {
      goals: goalProgress(sessions, goals, now),
      streak: goalWeekStreak(sessions, goals.workoutsPerWeek, now),
      regularity: regularity(sessions, goals.workoutsPerWeek, 4, now),
      week: weekDays(now).map((d) => ({ d, key: dayKey(d), done: trained.has(dayKey(d)) })),
    };
  }, [sessions, goals]);

  const today = dayKey();
  const weekMet = s.goals.week.done >= s.goals.week.goal && s.goals.week.goal > 0;

  return (
    <Card style={styles.card}>
      <View style={styles.hero}>
        <View accessible accessibilityLabel={`${t('stats.weekGoal')}: ${s.goals.week.done} / ${s.goals.week.goal}`}>
          <Ring value={s.goals.week.ratio} size={112} stroke={11} color={weekMet ? colors.success : colors.accent}>
            <Text style={styles.ringBig}>
              {s.goals.week.done}
              <Text style={styles.ringOf}>/{s.goals.week.goal}</Text>
            </Text>
            <Text style={styles.ringLabel}>{t('progress.ringWeek')}</Text>
          </Ring>
        </View>
        <View style={styles.stats}>
          <View>
            <View style={styles.valueRow}>
              <FireIcon size={18} color={colors.warning} weight="fill" />
              <Text style={styles.value}>{tn('unit.weeks', s.streak.current)}</Text>
            </View>
            <Text style={styles.label}>{t('progress.streakSub', { n: s.streak.best })}</Text>
          </View>
          <View>
            <Text style={styles.value}>
              {s.goals.month.done}
              <Text style={styles.valueOf}>/{s.goals.month.goal}</Text>
            </Text>
            <Text style={styles.label}>{t('progress.thisMonth')}</Text>
          </View>
          <View>
            <Text style={[styles.value, s.regularity != null && { color: statusColor(s.regularity * 100) }]}>
              {s.regularity == null ? '—' : `${Math.round(s.regularity * 100)}%`}
            </Text>
            <Text style={styles.label}>{t('progress.regularitySub')}</Text>
          </View>
        </View>
      </View>
      <View style={styles.days}>
        {s.week.map(({ d, key, done }) => (
          <View key={key} style={styles.day} accessible accessibilityLabel={`${weekdayShort(d)}${done ? ' ✓' : ''}`}>
            <View style={[styles.dot, done && styles.dotDone, !done && key === today && styles.dotToday, key > today && styles.dotFuture]}>
              {done && <CheckIcon size={14} color={colors.textOnAccent} weight="bold" />}
            </View>
            <Text style={[styles.dayLabel, key === today && { color: colors.textPrimary }]}>{weekdayShort(d).slice(0, 2)}</Text>
          </View>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: space.xl, gap: space.lg },
  hero: { flexDirection: 'row', alignItems: 'center', gap: space.xl },
  ringBig: { fontFamily: fonts.bold, fontSize: 28, color: colors.textPrimary, lineHeight: 32 },
  ringOf: { fontFamily: fonts.semibold, fontSize: 16, color: colors.textSecondary },
  ringLabel: { ...type.caption, fontSize: 11, color: colors.textSecondary },
  stats: { flex: 1, gap: space.md },
  valueRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  value: { fontFamily: fonts.bold, fontSize: 20, lineHeight: 24, color: colors.textPrimary },
  valueOf: { fontFamily: fonts.semibold, fontSize: 15, color: colors.textSecondary },
  label: { ...type.caption, color: colors.textSecondary },
  days: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: space.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.hairline },
  day: { alignItems: 'center', gap: space.xs },
  dot: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, borderColor: colors.track, alignItems: 'center', justifyContent: 'center' },
  dotDone: { backgroundColor: colors.accent, borderColor: colors.accent },
  dotToday: { borderColor: colors.accent },
  dotFuture: { opacity: 0.5 },
  dayLabel: { ...type.caption, fontSize: 11, color: colors.textSecondary },
});
