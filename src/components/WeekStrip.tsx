import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useT } from '../i18n';
import { dayKey } from '../lib/date';
import type { PlanDay } from '../store/derived';
import { colors, fonts, space, type } from '../theme/tokens';

type Props = {
  days: PlanDay[];
  selectedKey: string;
  onSelect: (key: string) => void;
  width: number; // available content width
};

export function WeekStrip({ days, selectedKey, onSelect, width }: Props) {
  const { t, weekdayShort } = useT();
  const todayKey = dayKey();
  const workouts = days.filter((d) => d.routine || d.session);
  const done = workouts.filter((d) => d.status === 'done').length;
  // Day chips shrink on narrow phones (≈ 320 pt) but never exceed 40 pt.
  const chip = Math.min(40, Math.floor(width / 7) - 6);

  return (
    <View>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{t('train.thisWeek')}</Text>
        <Text style={styles.count}>{t('train.completed', { done, total: workouts.length })}</Text>
      </View>

      <View style={styles.segments}>
        {workouts.map((d) => (
          <View
            key={d.key}
            style={[styles.segment, { backgroundColor: d.status === 'done' ? colors.textSecondary : colors.track }]}
          />
        ))}
      </View>

      <View style={styles.days} accessibilityRole="tablist">
        {days.map((d) => {
          const selected = d.key === selectedKey;
          const isToday = d.key === todayKey;
          const rest = d.status === 'rest';
          const label = weekdayShort(d.date);
          return (
            <Pressable
              key={d.key}
              onPress={() => onSelect(d.key)}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              accessibilityLabel={`${label} ${d.date.getDate()}${isToday ? `, ${t('common.today')}` : ''}${rest ? `, ${t('train.restDay')}` : ''}`}
              style={styles.day}
              hitSlop={4}
            >
              <Text style={[styles.weekday, isToday && styles.weekdayToday]}>{isToday ? t('common.today') : label}</Text>
              <View
                style={[
                  styles.chip,
                  { width: chip, height: chip, borderRadius: chip / 2 },
                  selected && styles.chipSelected,
                  !selected && isToday && styles.chipToday,
                ]}
              >
                <Text
                  style={[
                    styles.date,
                    rest && styles.dateRest,
                    selected && styles.dateSelected,
                  ]}
                >
                  {d.date.getDate()}
                </Text>
              </View>
              <View
                style={[
                  styles.dot,
                  d.status === 'done' && { backgroundColor: colors.success },
                  (d.status === 'planned' || d.status === 'today') && { backgroundColor: colors.textSecondary },
                  d.status === 'missed' && { backgroundColor: colors.track },
                ]}
              />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  title: { ...type.sectionTitle, color: colors.textPrimary },
  count: { ...type.body, color: colors.textSecondary },
  segments: {
    flexDirection: 'row',
    gap: space.sm,
    marginTop: space.md,
  },
  segment: { flex: 1, height: 4, borderRadius: 2 },
  days: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: space.xl,
  },
  day: { flex: 1, alignItems: 'center', gap: space.sm },
  weekday: { ...type.caption, color: colors.textSecondary },
  weekdayToday: { color: colors.accent, fontFamily: fonts.semibold },
  chip: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipSelected: { backgroundColor: colors.accent },
  chipToday: { borderWidth: 1.5, borderColor: colors.accent },
  date: { fontFamily: fonts.semibold, fontSize: 17, color: colors.textPrimary },
  dateRest: { color: colors.textSecondary },
  dateSelected: { color: colors.textOnAccent },
  dot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: 'transparent' },
});
