import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import type { MeasureKey, Measurement } from '../../data/types';
import { useT, type TKey } from '../../i18n';
import { addDays, dayKey, fromKey, startOfDay } from '../../lib/date';
import { pickPhoto } from '../../lib/photos';
import { formatNumber, formatWeight, toDisplayWeight } from '../../lib/units';
import { useStore } from '../../store';
import { colors, fonts, radius, space, type } from '../../theme/tokens';
import { CameraIcon, PlusIcon, RulerIcon, ScalesIcon } from '../icons';
import { ChartHeadline, LineChart } from '../ui/charts';
import { Button, Card, Notice, SectionTitle } from '../ui/controls';
import { useLayout } from '../ui/layout';
import { NumberSheet } from '../ui/sheets';

const MEASURES: MeasureKey[] = ['waist', 'chest', 'hips', 'arm', 'thigh', 'bodyFat'];
const DEFAULTS: Record<MeasureKey, number> = { waist: 85, chest: 100, hips: 95, arm: 35, thigh: 55, bodyFat: 18 };
const IN = 2.54;

/** Body: weight trend, measurements and physique photos. */
export function BodySection({ onLogWeight }: { onLogWeight: () => void }) {
  const { t, dateShort } = useT();
  const { contentWidth } = useLayout();
  const weighIns = useStore((s) => s.weighIns);
  const measurements = useStore((s) => s.measurements);
  const photos = useStore((s) => s.photos);
  const goals = useStore((s) => s.goals);
  const units = useStore((s) => s.settings.units);
  const addPhoto = useStore((s) => s.addPhoto);
  const logMeasurement = useStore((s) => s.logMeasurement);
  const [editing, setEditing] = useState<MeasureKey | null>(null);
  const [photoError, setPhotoError] = useState(false);

  const sinceKey = dayKey(addDays(startOfDay(), -91));
  const weights = useMemo(() => weighIns.filter((w) => w.date >= sinceKey).sort((a, b) => a.date.localeCompare(b.date)), [weighIns, sinceKey]);
  const points = weights.map((w) => ({ x: fromKey(w.date).getTime(), y: toDisplayWeight(w.kg, units) }));
  const delta = weights.length >= 2 ? weights[weights.length - 1].kg - weights[0].kg : undefined;

  const byKey = useMemo(() => {
    const out = {} as Record<MeasureKey, Measurement[]>;
    for (const k of MEASURES) out[k] = measurements.filter((m) => m.key === k).sort((a, b) => b.date.localeCompare(a.date));
    return out;
  }, [measurements]);

  // Circumferences are stored in cm; imperial users see inches.
  const lengthUnit = units === 'lb' ? 'in' : 'cm';
  const toDisplay = (k: MeasureKey, v: number) => (k === 'bodyFat' || units !== 'lb' ? v : v / IN);
  const fromDisplay = (k: MeasureKey, v: number) => (k === 'bodyFat' || units !== 'lb' ? v : v * IN);
  const unitOf = (k: MeasureKey) => (k === 'bodyFat' ? '%' : lengthUnit);

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
    <View>
      <SectionTitle style={styles.section} title={t('progress.body')} />

      {/* Weight */}
      <Card style={styles.card}>
        <View style={styles.cardHead}>
          <Text style={styles.label}>{t('progress.weight')}</Text>
          <Pressable onPress={onLogWeight} hitSlop={8} accessibilityRole="button">
            <Text style={styles.link}>{t('quick.logWeight')}</Text>
          </Pressable>
        </View>
        {points.length >= 2 ? (
          <>
            <ChartHeadline
              value={`${formatNumber(points[points.length - 1].y, 1)} ${units}`}
              delta={delta != null ? deltaText(toDisplayWeight(delta, units), units) : undefined}
              deltaGood={delta != null && Math.sign(delta) === Math.sign(goals.targetWeight - weights[0].kg)}
              caption={t('progress.since', { date: dateShort(fromKey(weights[0].date)) })}
            />
            <LineChart
              id="weight"
              color={colors.fat}
              points={points}
              height={120}
              format={(v) => formatNumber(v, 1)}
              reference={{ y: toDisplayWeight(goals.targetWeight, units), label: `${t('progress.goal')} ${formatWeight(goals.targetWeight, units)}` }}
              xLabels={edgeLabels(points, dateShort)}
            />
          </>
        ) : (
          <View style={styles.emptyRow}>
            <Text style={styles.muted}>{weights.length === 1 ? `${formatNumber(points[0].y, 1)} ${units}` : t('progress.noData')}</Text>
            <Button label={t('quick.logWeight')} icon={ScalesIcon} size="sm" variant="secondary" onPress={onLogWeight} />
          </View>
        )}
      </Card>

      {/* Measurements */}
      <Card style={styles.card}>
        <View style={styles.cardHead}>
          <View style={styles.labelRow}>
            <RulerIcon size={15} color={colors.textSecondary} weight="bold" />
            <Text style={styles.label}>{t('progress.measurements')}</Text>
          </View>
        </View>
        <View style={styles.grid}>
          {MEASURES.map((k) => {
            const [last, prev] = byKey[k];
            const d = last && prev ? toDisplay(k, last.value) - toDisplay(k, prev.value) : undefined;
            return (
              <Pressable
                key={k}
                onPress={() => setEditing(k)}
                style={({ pressed }) => [styles.measure, pressed && { opacity: 0.8 }]}
                accessibilityRole="button"
                accessibilityLabel={t(`measure.${k}` as TKey)}
              >
                <Text style={styles.measureLabel} numberOfLines={1}>
                  {t(`measure.${k}` as TKey)}
                </Text>
                <Text style={[styles.measureValue, !last && { color: colors.textSecondary }]} numberOfLines={1}>
                  {last ? `${formatNumber(toDisplay(k, last.value), 1)} ${unitOf(k)}` : t('progress.notLogged')}
                </Text>
                <Text style={styles.measureMeta} numberOfLines={1}>
                  {last ? `${dateShort(fromKey(last.date))}${d != null && Math.abs(d) >= 0.05 ? ` · ${d > 0 ? '+' : '−'}${formatNumber(Math.abs(d), 1)}` : ''}` : ' '}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {measurements.length === 0 && <Text style={styles.small}>{t('progress.measureHint')}</Text>}
      </Card>

      {/* Photos */}
      <View style={styles.photoHead}>
        <Text style={styles.subTitle}>{t('progress.photos')}</Text>
      </View>
      {photos.length === 0 && <Text style={[styles.muted, { marginTop: space.xs }]}>{t('progress.noPhotos')}</Text>}
      {photoError && (
        <View style={{ marginTop: space.md }}>
          <Notice text={t('photo.denied')} icon={CameraIcon} />
        </View>
      )}
      <View style={styles.photos}>
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

      <NumberSheet
        visible={editing != null}
        onClose={() => setEditing(null)}
        title={editing ? t(`measure.${editing}` as TKey) : ''}
        value={editing ? Math.round(toDisplay(editing, byKey[editing][0]?.value ?? DEFAULTS[editing]) * 10) / 10 : 0}
        unit={editing ? unitOf(editing) : ''}
        step={editing === 'bodyFat' ? 0.5 : units === 'lb' ? 0.25 : 0.5}
        decimals={1}
        min={editing === 'bodyFat' ? 2 : 5}
        max={editing === 'bodyFat' ? 70 : 250}
        onSave={(v) => editing && logMeasurement(editing, Math.round(fromDisplay(editing, v) * 10) / 10)}
      />
    </View>
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
  section: { marginTop: space.xxl + space.xxs },
  card: { marginTop: space.md, gap: space.md },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  label: { ...type.caption, fontFamily: fonts.semibold, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.6 },
  link: { ...type.body, fontFamily: fonts.semibold, color: colors.accent },
  muted: { ...type.body, color: colors.textSecondary },
  small: { ...type.caption, color: colors.textSecondary },
  emptyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  measure: { width: '31%', flexGrow: 1, backgroundColor: colors.surfaceAccent, borderRadius: radius.md, padding: space.sm + 2, gap: 2 },
  measureLabel: { ...type.caption, fontSize: 11, color: colors.textSecondary },
  measureValue: { fontFamily: fonts.bold, fontSize: 16, color: colors.textPrimary, fontVariant: ['tabular-nums'] },
  measureMeta: { ...type.caption, fontSize: 10, color: colors.textSecondary },
  photoHead: { marginTop: space.xl },
  subTitle: { ...type.itemTitle, fontFamily: fonts.semibold, color: colors.textPrimary },
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
