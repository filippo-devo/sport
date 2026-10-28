import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { CameraIcon, PlusIcon, ScalesIcon, TrophyIcon } from '../../components/icons';
import { LogWeightSheet } from '../../components/LogWeightSheet';
import { SessionRow } from '../../components/SessionRow';
import { BarChart, ChartHeadline, LineChart } from '../../components/ui/charts';
import { Button, Card, Chip, Divider, Notice, Segmented, SectionTitle } from '../../components/ui/controls';
import { TabHeader } from '../../components/ui/headers';
import { Screen, useLayout } from '../../components/ui/layout';
import { EXERCISE_BY_ID } from '../../data/exercises';
import { useT } from '../../i18n';
import { addDays, dayKey, fromKey, startOfDay } from '../../lib/date';
import { pickPhoto } from '../../lib/photos';
import { useNow } from '../../lib/useNow';
import { formatNumber, formatVolume, formatWeight, toDisplayWeight } from '../../lib/units';
import { useStore } from '../../store';
import { allRecords, exerciseHistory, mealsOn, sortedSessions, sumNutrients, weeklyVolume } from '../../store/derived';
import { colors, fonts, radius, space, type } from '../../theme/tokens';

type Range = '1m' | '3m' | 'all';

export default function ProgressScreen() {
  const { t, L, dateShort } = useT();
  const { contentWidth, gutter } = useLayout();
  const sessions = useStore((s) => s.sessions);
  const weighIns = useStore((s) => s.weighIns);
  const meals = useStore((s) => s.meals);
  const photos = useStore((s) => s.photos);
  const goals = useStore((s) => s.goals);
  const units = useStore((s) => s.settings.units);
  const addPhoto = useStore((s) => s.addPhoto);
  const [range, setRange] = useState<Range>('3m');
  const now = useNow(0);
  const [weightOpen, setWeightOpen] = useState(false);
  const [photoError, setPhotoError] = useState(false);

  const since = range === '1m' ? addDays(startOfDay(), -30).getTime() : range === '3m' ? addDays(startOfDay(), -91).getTime() : 0;
  const inRange = useMemo(() => sessions.filter((s) => s.startedAt >= since), [sessions, since]);

  // Lifts with enough history to chart, most frequent first.
  const lifts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of inRange) for (const e of s.exercises) if (EXERCISE_BY_ID[e.exerciseId]?.tracking === 'weightReps') counts.set(e.exerciseId, (counts.get(e.exerciseId) ?? 0) + 1);
    return [...counts.entries()].filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([id]) => id);
  }, [inRange]);
  const [liftChoice, setLift] = useState<string | null>(null);
  const lift = liftChoice && lifts.includes(liftChoice) ? liftChoice : lifts[0];
  const liftPoints = lift ? exerciseHistory(inRange, lift).map((p) => ({ x: p.t, y: toDisplayWeight(p.e1rm, units) })) : [];

  const weeks = range === '1m' ? 5 : range === '3m' ? 13 : Math.max(8, Math.ceil((now - Math.min(...sessions.map((s) => s.startedAt), now)) / (7 * 86400000)));
  const volume = weeklyVolume(sessions, weeks);

  const sinceKey = dayKey(new Date(since));
  const weights = weighIns.filter((w) => w.date >= sinceKey).sort((a, b) => a.date.localeCompare(b.date));
  const weightPoints = weights.map((w) => ({ x: fromKey(w.date).getTime(), y: toDisplayWeight(w.kg, units) }));
  const weightDelta = weights.length >= 2 ? weights[weights.length - 1].kg - weights[0].kg : undefined;

  const calorieDays = Array.from({ length: 14 }, (_, i) => addDays(startOfDay(), i - 13));
  const calories = calorieDays.map((d) => sumNutrients(mealsOn(meals, dayKey(d))).kcal);
  const logged = calories.filter((c) => c > 0);

  const records = allRecords(sessions).slice(0, 6);
  const history = sortedSessions(sessions).slice(0, 4);
  const thumb = (contentWidth - space.sm * 2) / 3;

  const onAddPhoto = async () => {
    setPhotoError(false);
    try {
      const p = await pickPhoto();
      if (p) addPhoto(p);
    } catch {
      setPhotoError(true);
    }
  };

  return (
    <Screen tabBar>
      <TabHeader title={t('progress.title')} />
      <View style={styles.range}>
        <Segmented
          value={range}
          onChange={setRange}
          options={[
            { value: '1m', label: t('progress.range1m') },
            { value: '3m', label: t('progress.range3m') },
            { value: 'all', label: t('progress.rangeAll') },
          ]}
        />
      </View>

      {/* Strength */}
      <SectionTitle style={styles.section} title={t('progress.strength')} />
      <Card style={styles.card}>
        {lift && liftPoints.length >= 2 ? (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} style={{ marginHorizontal: -space.lg }}>
              {lifts.map((id) => (
                <Chip key={id} label={L(EXERCISE_BY_ID[id].name)} selected={id === lift} onPress={() => setLift(id)} />
              ))}
            </ScrollView>
            <ChartHeadline
              value={`${formatNumber(liftPoints[liftPoints.length - 1].y, 1)} ${units}`}
              delta={deltaText(liftPoints[liftPoints.length - 1].y - liftPoints[0].y, units)}
              deltaGood={liftPoints[liftPoints.length - 1].y >= liftPoints[0].y}
              caption={t('progress.strengthSub')}
            />
            <LineChart
              id="strength"
              points={liftPoints}
              format={(v) => String(Math.round(v))}
              xLabels={edgeLabels(liftPoints, dateShort)}
            />
          </>
        ) : (
          <Text style={styles.muted}>{t('progress.noData')}</Text>
        )}
      </Card>

      {/* Volume */}
      <SectionTitle style={styles.section} title={t('progress.volume')} />
      <Card style={styles.card}>
        <ChartHeadline value={formatVolume(volume[volume.length - 1]?.volume ?? 0, units)} caption={t('progress.thisWeek')} />
        <BarChart
          values={volume.map((v) => toDisplayWeight(v.volume, units))}
          labels={volume.map((v, i) => (i === 0 || i === volume.length - 1 || (volume.length <= 6 ? true : i % Math.ceil(volume.length / 4) === 0) ? dateShort(v.week) : ''))}
          format={(v) => (v >= 1000 ? `${formatNumber(v / 1000, 0)}k` : String(Math.round(v)))}
        />
      </Card>

      {/* Body weight */}
      <SectionTitle style={styles.section} title={t('progress.bodyWeight')} aside={t('quick.logWeight')} onAside={() => setWeightOpen(true)} />
      <Card style={styles.card}>
        {weightPoints.length >= 2 ? (
          <>
            <ChartHeadline
              value={`${formatNumber(weightPoints[weightPoints.length - 1].y, 1)} ${units}`}
              delta={weightDelta != null ? deltaText(toDisplayWeight(weightDelta, units), units) : undefined}
              deltaGood={weightDelta != null && Math.sign(weightDelta) === Math.sign(goals.targetWeight - weights[0].kg)}
              caption={t('progress.since', { date: dateShort(fromKey(weights[0].date)) })}
            />
            <LineChart
              id="weight"
              color={colors.fat}
              points={weightPoints}
              format={(v) => formatNumber(v, 1)}
              reference={{ y: toDisplayWeight(goals.targetWeight, units), label: `${t('progress.goal')} ${formatWeight(goals.targetWeight, units)}` }}
              xLabels={edgeLabels(weightPoints, dateShort)}
            />
          </>
        ) : (
          <View style={styles.emptyRow}>
            <Text style={styles.muted}>{t('progress.noData')}</Text>
            <Button label={t('quick.logWeight')} icon={ScalesIcon} size="sm" variant="secondary" onPress={() => setWeightOpen(true)} />
          </View>
        )}
      </Card>

      {/* Calories */}
      <SectionTitle style={styles.section} title={t('progress.calories')} aside={t('progress.last14')} />
      <Card style={styles.card}>
        <ChartHeadline
          value={logged.length ? t('progress.avg', { n: Math.round(logged.reduce((a, b) => a + b, 0) / logged.length) }) : '—'}
          caption={`${t('progress.caloriesSub')} · ${t('progress.goal')} ${goals.kcal} kcal`}
        />
        <BarChart
          values={calories}
          goal={goals.kcal}
          color={colors.accent}
          labels={calorieDays.map((d, i) => (i % 3 === 1 || i === 13 ? String(d.getDate()) : ''))}
        />
      </Card>

      {/* Records */}
      <SectionTitle style={styles.section} title={t('progress.records')} />
      <View style={{ marginTop: space.xs }}>
        {records.length === 0 && <Text style={[styles.muted, { marginTop: space.sm }]}>{t('progress.noData')}</Text>}
        {records.map((r, i) => {
          const ex = EXERCISE_BY_ID[r.exerciseId];
          if (!ex) return null;
          const value =
            ex.tracking === 'weightReps'
              ? `${formatWeight(r.best.weight, units)} × ${r.best.reps}`
              : ex.tracking === 'reps'
                ? `× ${r.best.reps}`
                : `${r.best.seconds} s`;
          return (
            <View key={r.exerciseId}>
              {i > 0 && <Divider inset={36 + space.md} />}
              <Pressable style={styles.recordRow} onPress={() => router.push(`/exercise/${ex.id}`)} accessibilityRole="button">
                <View style={styles.trophy}>
                  <TrophyIcon size={16} color={colors.accent} weight="fill" />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.recordName} numberOfLines={1}>
                    {L(ex.name)}
                  </Text>
                  <Text style={styles.recordMeta}>
                    {dateShort(new Date(r.best.date))}
                    {ex.tracking === 'weightReps' ? ` · 1RM ${formatWeight(r.best.e1rm, units)}` : ''}
                  </Text>
                </View>
                <Text style={styles.recordValue}>{value}</Text>
              </Pressable>
            </View>
          );
        })}
      </View>

      {/* History */}
      <SectionTitle style={styles.section} title={t('progress.history')} aside={t('common.seeAll')} onAside={() => router.push('/history')} />
      <View>
        {history.length === 0 && <Text style={[styles.muted, { marginTop: space.sm }]}>{t('history.empty')}</Text>}
        {history.map((s, i) => (
          <View key={s.id}>
            {i > 0 && <Divider inset={48 + space.md} />}
            <SessionRow session={s} units={units} />
          </View>
        ))}
      </View>

      {/* Photos */}
      <SectionTitle style={styles.section} title={t('progress.photos')} />
      {photos.length === 0 && <Text style={[styles.muted, { marginTop: space.sm }]}>{t('progress.noPhotos')}</Text>}
      {photoError && (
        <View style={{ marginTop: space.md }}>
          <Notice text={t('photo.denied')} icon={CameraIcon} />
        </View>
      )}
      <View style={[styles.photos, { marginHorizontal: 0 }]}>
        <Pressable
          onPress={onAddPhoto}
          style={({ pressed }) => [styles.addPhoto, { width: thumb, height: thumb * 1.33 }, pressed && { opacity: 0.8 }]}
          accessibilityRole="button"
          accessibilityLabel={t('progress.addPhoto')}
        >
          <PlusIcon size={22} color={colors.accent} weight="bold" />
          <Text style={styles.addPhotoText}>{t('progress.addPhoto')}</Text>
        </Pressable>
        {photos.map((p) => (
          <Pressable key={p.id} onPress={() => router.push(`/photo/${p.id}`)} accessibilityRole="imagebutton" accessibilityLabel={dateShort(fromKey(p.date))}>
            <Image source={{ uri: p.uri }} style={{ width: thumb, height: thumb * 1.33, borderRadius: radius.md, backgroundColor: colors.surface }} resizeMode="cover" />
            <Text style={styles.photoDate}>{dateShort(fromKey(p.date))}</Text>
          </Pressable>
        ))}
      </View>
      <View style={{ height: gutter }} />

      <LogWeightSheet visible={weightOpen} onClose={() => setWeightOpen(false)} />
    </Screen>
  );
}

function deltaText(d: number, units: string) {
  if (Math.abs(d) < 0.05) return `±0 ${units}`;
  return `${d > 0 ? '+' : '−'}${formatNumber(Math.abs(d), 1)} ${units}`;
}

function edgeLabels(points: { x: number }[], fmt: (d: Date) => string) {
  if (points.length < 2) return [];
  const mid = points[Math.floor(points.length / 2)];
  return [points[0], mid, points[points.length - 1]].map((p) => ({ x: p.x, label: fmt(new Date(p.x)) }));
}

const styles = StyleSheet.create({
  range: { marginTop: space.xl },
  section: { marginTop: space.xxl + space.xxs },
  card: { marginTop: space.md, gap: space.md },
  chips: { gap: space.sm, paddingHorizontal: space.lg },
  muted: { ...type.body, color: colors.textSecondary },
  emptyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md },
  recordRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md },
  trophy: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  recordName: { ...type.itemTitle, color: colors.textPrimary },
  recordMeta: { ...type.caption, color: colors.textSecondary, marginTop: 2 },
  recordValue: { fontFamily: fonts.semibold, fontSize: 15, color: colors.textPrimary, fontVariant: ['tabular-nums'] },
  photos: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.md },
  addPhoto: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.cardStroke,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
    padding: space.sm,
  },
  addPhotoText: { ...type.caption, color: colors.textPrimary, textAlign: 'center' },
  photoDate: { ...type.caption, color: colors.textSecondary, marginTop: 4 },
});
