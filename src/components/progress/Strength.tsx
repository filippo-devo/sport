import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Polyline } from 'react-native-svg';

import { EXERCISE_BY_ID } from '../../data/exercises';
import { useT } from '../../i18n';
import { formatNumber, formatWeight, toDisplayWeight } from '../../lib/units';
import { useStore } from '../../store';
import { allRecords, exerciseHistory } from '../../store/derived';
import { colors, fonts, radius, space, type } from '../../theme/tokens';
import { BarbellIcon, TrophyIcon } from '../icons';
import { Card, Divider, SectionTitle } from '../ui/controls';

const SECTION = { marginTop: space.xxl + space.xxs };

/** Main lifts in the range: latest estimated 1RM, a sparkline and the change. */
export function StrengthList({ since }: { since: number }) {
  const { t, L } = useT();
  const sessions = useStore((s) => s.sessions);
  const units = useStore((s) => s.settings.units);
  const [all, setAll] = useState(false);

  const lifts = useMemo(() => {
    const inRange = sessions.filter((s) => s.startedAt >= since);
    const counts = new Map<string, number>();
    for (const s of inRange) for (const e of s.exercises) if (EXERCISE_BY_ID[e.exerciseId]?.tracking === 'weightReps') counts.set(e.exerciseId, (counts.get(e.exerciseId) ?? 0) + 1);
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([id]) => ({ id, points: exerciseHistory(inRange, id).map((p) => toDisplayWeight(p.e1rm, units)).filter((v) => v > 0) }))
      .filter((l) => l.points.length > 0);
  }, [sessions, since, units]);

  const shown = all ? lifts : lifts.slice(0, 3);

  return (
    <View>
      <SectionTitle
        style={SECTION}
        title={t('progress.strength')}
        aside={lifts.length > 3 ? (all ? t('progress.showLess') : t('common.seeAll')) : undefined}
        onAside={() => setAll((v) => !v)}
      />
      <Card style={styles.card}>
        {shown.length === 0 && <Text style={styles.muted}>{t('progress.noData')}</Text>}
        {shown.map((l, i) => {
          const ex = EXERCISE_BY_ID[l.id];
          const last = l.points[l.points.length - 1];
          const d = last - l.points[0];
          const up = d >= 0.05;
          return (
            <View key={l.id}>
              {i > 0 && <Divider inset={40 + space.md} />}
              <Pressable style={styles.row} onPress={() => router.push(`/exercise/${l.id}`)} accessibilityRole="button">
                <View style={styles.icon}>
                  <BarbellIcon size={20} color={colors.accent} weight="bold" />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.name} numberOfLines={2}>
                    {L(ex.name)}
                  </Text>
                  <Text style={styles.muted}>{t('progress.e1rm')}</Text>
                </View>
                <Spark values={l.points} color={up ? colors.accent : colors.textSecondary} />
                <View style={styles.right}>
                  <Text style={styles.value}>{`${formatNumber(last, 1)} ${units}`}</Text>
                  <Text style={[styles.delta, { color: up ? colors.success : d <= -0.05 ? colors.danger : colors.textSecondary }]}>
                    {Math.abs(d) < 0.05 ? t('progress.noChange') : `${d > 0 ? '+' : '−'}${formatNumber(Math.abs(d), 1)} ${units}`}
                  </Text>
                </View>
              </Pressable>
            </View>
          );
        })}
      </Card>
    </View>
  );
}

function Spark({ values, color }: { values: number[]; color: string }) {
  const w = 44;
  const h = 26;
  if (values.length < 2) return <View style={{ width: w }} />;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * (w - 4) + 2},${h - 3 - ((v - min) / span) * (h - 6)}`).join(' ');
  return (
    <Svg width={w} height={h}>
      <Polyline points={pts} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/** Newest personal records in the range as horizontal cards. */
export function RecordsRail({ since }: { since: number }) {
  const { t, L, dateShort } = useT();
  const sessions = useStore((s) => s.sessions);
  const units = useStore((s) => s.settings.units);
  const records = useMemo(() => allRecords(sessions).filter((r) => r.best.date >= since).slice(0, 8), [sessions, since]);

  return (
    <View>
      <SectionTitle style={SECTION} title={t('progress.records')} aside={records.length ? t('progress.recent') : undefined} />
      {records.length === 0 ? (
        <Text style={[styles.muted, { marginTop: space.sm }]}>{t('progress.noData')}</Text>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.rail} contentContainerStyle={styles.railContent}>
          {records.map((r) => {
            const ex = EXERCISE_BY_ID[r.exerciseId];
            if (!ex) return null;
            const value =
              ex.tracking === 'weightReps' ? `${formatWeight(r.best.weight, units)} × ${r.best.reps}` : ex.tracking === 'reps' ? `× ${r.best.reps}` : `${r.best.seconds} s`;
            return (
              <Pressable key={r.exerciseId} style={styles.pr} onPress={() => router.push(`/exercise/${ex.id}`)} accessibilityRole="button">
                <TrophyIcon size={18} color={colors.warning} weight="fill" />
                <Text style={styles.prValue} numberOfLines={1}>
                  {value}
                </Text>
                <Text style={styles.muted} numberOfLines={1}>
                  {L(ex.name)}
                </Text>
                <Text style={styles.prDate}>{dateShort(new Date(r.best.date))}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: space.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm },
  icon: { width: 40, height: 40, borderRadius: radius.sm, backgroundColor: colors.control, alignItems: 'center', justifyContent: 'center' },
  name: { ...type.itemTitle, fontSize: 15, lineHeight: 19, color: colors.textPrimary },
  muted: { ...type.caption, fontSize: 13, color: colors.textSecondary },
  right: { alignItems: 'flex-end', minWidth: 76 },
  value: { fontFamily: fonts.bold, fontSize: 16, color: colors.textPrimary, fontVariant: ['tabular-nums'] },
  delta: { fontFamily: fonts.semibold, fontSize: 12 },
  rail: { marginTop: space.md, marginHorizontal: -16 },
  railContent: { gap: space.sm, paddingHorizontal: 16 },
  pr: { width: 150, backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.md, gap: 2 },
  prValue: { fontFamily: fonts.bold, fontSize: 19, color: colors.textPrimary, marginTop: space.sm },
  prDate: { ...type.caption, fontSize: 11, color: colors.textSecondary, marginTop: 2 },
});
