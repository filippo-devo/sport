import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { ExerciseTile } from '../../components/EquipmentGlyph';
import { Card, Divider, SectionTitle } from '../../components/ui/controls';
import { LineChart } from '../../components/ui/charts';
import { NavBar } from '../../components/ui/headers';
import { Screen } from '../../components/ui/layout';
import { EXERCISE_BY_ID } from '../../data/exercises';
import { useT } from '../../i18n';
import { formatWeight, toDisplayWeight } from '../../lib/units';
import { useStore } from '../../store';
import { exerciseHistory, personalBest, setRecords, sortedSessions } from '../../store/derived';
import { colors, fonts, radius, space, type } from '../../theme/tokens';

export default function ExerciseDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, tn, L, lang, dateShort } = useT();
  const sessions = useStore((s) => s.sessions);
  const units = useStore((s) => s.settings.units);
  const ex = EXERCISE_BY_ID[id];
  if (!ex) return <Screen top={<NavBar />}>{null}</Screen>;

  const history = exerciseHistory(sessions, ex.id);
  const best = personalBest(sessions, ex.id);
  const records = ex.tracking === 'weightReps' ? setRecords(sessions, ex.id) : [];
  const recent = sortedSessions(sessions)
    .filter((s) => s.exercises.some((e) => e.exerciseId === ex.id))
    .slice(0, 6);

  const metric = (p: (typeof history)[number]) =>
    ex.tracking === 'weightReps' ? toDisplayWeight(p.e1rm, units) : ex.tracking === 'reps' ? p.reps : p.seconds;
  const points = history.map((p) => ({ x: p.t, y: metric(p) }));
  const chartTitle = ex.tracking === 'weightReps' ? t('exercise.progress') : ex.tracking === 'reps' ? t('exercise.progressReps') : t('exercise.progressTime');

  const bestValue = !best
    ? '—'
    : ex.tracking === 'weightReps'
      ? formatWeight(best.e1rm, units)
      : ex.tracking === 'reps'
        ? `${best.reps}`
        : `${best.seconds} s`;
  const bestSet = !best ? '—' : ex.tracking === 'weightReps' ? `${formatWeight(best.weight, units)} × ${best.reps}` : bestValue;

  const setSummary = (sets: { weight?: number; reps?: number; seconds?: number }[]) =>
    sets
      .map((s) =>
        ex.tracking === 'time' ? `${s.seconds ?? 0} s` : ex.tracking === 'reps' ? `${s.reps ?? 0}` : `${formatWeight(s.weight ?? 0, units, false)}×${s.reps ?? 0}`,
      )
      .join(', ');

  return (
    <Screen top={<NavBar />}>
      <View style={styles.hero}>
        <ExerciseTile equipment={ex.equipment} size={64} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.title} accessibilityRole="header">
            {L(ex.name)}
          </Text>
          <Text style={styles.sub}>
            {t(`muscle.${ex.muscle}`)} · {t(`equipment.${ex.equipment}`)}
          </Text>
        </View>
      </View>

      <View style={styles.stats}>
        <Card style={styles.stat}>
          <Text style={styles.statLabel}>{ex.tracking === 'weightReps' ? t('exercise.e1rm') : chartTitle}</Text>
          <Text style={styles.statValue}>{bestValue}</Text>
        </Card>
        <Card style={styles.stat}>
          <Text style={styles.statLabel}>{t('exercise.best')}</Text>
          <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
            {bestSet}
          </Text>
        </Card>
        <Card style={styles.stat}>
          <Text style={styles.statLabel}>{t('exercise.sessions')}</Text>
          <Text style={styles.statValue}>{history.length}</Text>
        </Card>
      </View>

      <SectionTitle style={styles.section} title={chartTitle} />
      <Card style={styles.chart}>
        {points.length >= 2 ? (
          <LineChart
            id={`ex-${ex.id}`}
            points={points}
            format={(v) => String(Math.round(v))}
            xLabels={[points[0], points[points.length - 1]].map((p) => ({ x: p.x, label: dateShort(new Date(p.x)) }))}
          />
        ) : (
          <Text style={styles.muted}>{history.length ? t('progress.noData') : t('exercise.noHistory')}</Text>
        )}
      </Card>

      <SectionTitle style={styles.section} title={t('exercise.howTo')} />
      <View style={styles.steps}>
        {ex.steps[lang].map((step, i) => (
            <View key={i} style={styles.step}>
              <View style={styles.stepNo}>
                <Text style={styles.stepNoText}>{i + 1}</Text>
              </View>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}
      </View>

      <View style={[styles.section, styles.muscles]}>
        <Text style={styles.muscleLabel}>{t('exercise.primary')}</Text>
        <View style={styles.tags}>
          <Text style={[styles.tag, styles.tagPrimary]}>{t(`muscle.${ex.muscle}`)}</Text>
        </View>
        {ex.secondary.length > 0 && (
          <>
            <Text style={[styles.muscleLabel, { marginTop: space.md }]}>{t('exercise.secondary')}</Text>
            <View style={styles.tags}>
              {ex.secondary.map((m) => (
                <Text key={m} style={styles.tag}>
                  {t(`muscle.${m}`)}
                </Text>
              ))}
            </View>
          </>
        )}
      </View>

      {records.length > 0 && (
        <>
          <SectionTitle style={styles.section} title={t('exercise.records')} />
          <Card style={styles.table}>
            <View style={styles.tr}>
              <Text style={[styles.th, { flex: 1 }]}>{t('exercise.reps')}</Text>
              <Text style={[styles.th, { flex: 1, textAlign: 'right' }]}>{t('exercise.weight')}</Text>
            </View>
            {records.map((r) => (
              <View key={r.reps}>
                <Divider />
                <View style={styles.tr}>
                  <Text style={[styles.td, { flex: 1 }]}>{r.reps}</Text>
                  <Text style={[styles.td, { flex: 1, textAlign: 'right' }]}>{formatWeight(r.weight, units)}</Text>
                </View>
              </View>
            ))}
          </Card>
        </>
      )}

      <SectionTitle style={styles.section} title={t('exercise.history')} />
      {recent.length === 0 ? (
        <Text style={[styles.muted, { marginTop: space.sm }]}>{t('exercise.noHistory')}</Text>
      ) : (
        <View style={{ marginTop: space.xs }}>
          {recent.map((s, i) => {
            const e = s.exercises.find((x) => x.exerciseId === ex.id)!;
            return (
              <View key={s.id}>
                {i > 0 && <Divider />}
                <Text
                  style={styles.histRow}
                  onPress={() => router.push(`/session/${s.id}`)}
                  accessibilityRole="link"
                >
                  <Text style={styles.histDate}>{dateShort(new Date(s.startedAt))}  </Text>
                  <Text style={styles.histName}>{L(s.name)}</Text>
                  {'\n'}
                  <Text style={styles.histSets}>
                    {tn('unit.sets', e.sets.length)} · {setSummary(e.sets)}
                  </Text>
                </Text>
              </View>
            );
          })}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: 'row', alignItems: 'center', gap: space.lg, marginTop: space.sm },
  title: { ...type.heroTitle, fontSize: 26, lineHeight: 30, color: colors.textPrimary },
  sub: { ...type.body, color: colors.textSecondary, marginTop: 4 },
  stats: { flexDirection: 'row', gap: space.sm, marginTop: space.xl },
  stat: { flex: 1, padding: space.md, gap: 4 },
  statLabel: { ...type.caption, color: colors.textSecondary },
  statValue: { fontFamily: fonts.bold, fontSize: 18, color: colors.textPrimary },
  section: { marginTop: space.xxl },
  chart: { marginTop: space.md, paddingHorizontal: space.md },
  muted: { ...type.body, color: colors.textSecondary },
  steps: { gap: space.md, marginTop: space.md },
  step: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start' },
  stepNo: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.control, alignItems: 'center', justifyContent: 'center' },
  stepNoText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.accent },
  stepText: { ...type.body, fontFamily: fonts.regular, fontSize: 16, lineHeight: 22, color: colors.textPrimary, flex: 1 },
  muscles: {},
  muscleLabel: { ...type.caption, color: colors.textSecondary, marginBottom: space.sm },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  tag: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.textPrimary,
    paddingHorizontal: space.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  tagPrimary: { backgroundColor: colors.accent, color: colors.textOnAccent },
  table: { marginTop: space.md, paddingVertical: space.xs },
  tr: { flexDirection: 'row', paddingVertical: space.sm + 2 },
  th: { ...type.caption, color: colors.textSecondary },
  td: { fontFamily: fonts.semibold, fontSize: 16, color: colors.textPrimary, fontVariant: ['tabular-nums'] },
  histRow: { paddingVertical: space.md },
  histDate: { fontFamily: fonts.semibold, fontSize: 14, color: colors.textSecondary },
  histName: { fontFamily: fonts.medium, fontSize: 16, color: colors.textPrimary },
  histSets: { fontFamily: fonts.regular, fontSize: 14, color: colors.textSecondary },
});
