import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { useT } from '../../i18n';
import { dayKey } from '../../lib/date';
import type { PlanDay } from '../../store/derived';
import { colors, fonts, radius, space, type } from '../../theme/tokens';
import { CheckIcon } from '../icons';

type Props = { days: PlanDay[]; selectedKey: string; onSelect: (key: string) => void; width: number };

/**
 * Compact week card for Train (Ladder pattern): a progress ring with "done/planned"
 * and one dot per day. Green check = workout logged, dashed = planned, volt = selected.
 */
export function TrainWeek({ days, selectedKey, onSelect, width }: Props) {
  const { t, weekdayShort } = useT();
  const todayKey = dayKey();
  const workouts = days.filter((d) => d.routine || d.session);
  const done = workouts.filter((d) => d.status === 'done').length;
  const total = workouts.length;
  const ring = 56;
  // Card padding (2×14) + ring + gap leave this much for 7 dots.
  const dot = Math.max(24, Math.min(32, Math.floor((width - 28 - ring - 14) / 7) - 8));

  return (
    <View style={styles.card}>
      <View accessible accessibilityLabel={t('train.weekDone', { done, total })}>
        <Ring size={ring} value={total ? done / total : 0} />
        <View style={[StyleSheet.absoluteFill, styles.ringLabel]}>
          <Text style={styles.ringText}>
            {done}/{total}
          </Text>
        </View>
      </View>
      <View style={styles.days} accessibilityRole="tablist">
        {days.map((d) => {
          const selected = d.key === selectedKey;
          const isToday = d.key === todayKey;
          const isDone = d.status === 'done';
          const planned = !isDone && !!d.routine;
          return (
            <Pressable
              key={d.key}
              onPress={() => onSelect(d.key)}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              accessibilityLabel={`${weekdayShort(d.date)} ${d.date.getDate()}${isToday ? `, ${t('common.today')}` : ''}${d.status === 'rest' ? `, ${t('train.restDay')}` : ''}`}
              hitSlop={4}
              style={styles.day}
            >
              <Text style={[styles.weekday, (selected || isToday) && styles.weekdayOn]}>{weekdayShort(d.date)}</Text>
              <View
                style={[
                  styles.dot,
                  { width: dot, height: dot, borderRadius: dot / 2 },
                  planned && styles.dotPlanned,
                  isDone && styles.dotDone,
                  isToday && !selected && !isDone && styles.dotToday,
                  selected && !isDone && styles.dotSelected,
                  selected && isDone && styles.dotDoneSelected,
                ]}
              >
                {isDone ? (
                  <CheckIcon size={dot * 0.5} color={colors.textOnAccent} weight="bold" />
                ) : (
                  <Text style={[styles.date, selected && styles.dateSelected, d.status === 'rest' && !selected && styles.dateRest]}>{d.date.getDate()}</Text>
                )}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function Ring({ size, value }: { size: number; value: number }) {
  const stroke = 5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <Svg width={size} height={size}>
      <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.track} strokeWidth={stroke} fill="none" />
      {value > 0 && (
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={colors.accent}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${c * Math.min(1, value)} ${c}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      )}
    </Svg>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
  },
  ringLabel: { alignItems: 'center', justifyContent: 'center' },
  ringText: { fontFamily: fonts.bold, fontSize: 15, color: colors.textPrimary },
  days: { flex: 1, flexDirection: 'row', justifyContent: 'space-between' },
  day: { alignItems: 'center', gap: space.xs },
  weekday: { ...type.caption, color: colors.textSecondary },
  weekdayOn: { color: colors.accent, fontFamily: fonts.semibold },
  dot: { alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: colors.track },
  dotPlanned: { borderStyle: 'dashed', borderColor: colors.textSecondary },
  dotToday: { borderStyle: 'solid', borderColor: colors.accent },
  dotSelected: { borderStyle: 'solid', borderColor: colors.accent, backgroundColor: colors.accent },
  dotDone: { borderStyle: 'solid', borderColor: colors.success, backgroundColor: colors.success },
  dotDoneSelected: { borderColor: colors.accent, borderWidth: 2 },
  date: { fontFamily: fonts.semibold, fontSize: 12, color: colors.textPrimary },
  dateSelected: { color: colors.textOnAccent },
  dateRest: { color: colors.textSecondary },
});
