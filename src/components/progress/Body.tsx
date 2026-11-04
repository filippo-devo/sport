import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { Photo, PhotoPose } from '../../data/types';
import { useT } from '../../i18n';
import { dayKey, fromKey } from '../../lib/date';
import { pickPhoto } from '../../lib/photos';
import { photoDueIn } from '../../lib/today';
import { formatBodyWeight, formatNumber, toDisplayWeight } from '../../lib/units';
import { useStore } from '../../store';
import { colors, fonts, radius, space, type } from '../../theme/tokens';
import { CameraIcon, PersonSimpleIcon, PlusIcon, ScalesIcon } from '../icons';
import { LineChart } from '../ui/charts';
import { Button, Card, Notice, ProgressBar, SectionTitle } from '../ui/controls';

const SECTION = { marginTop: space.xxl + space.xxs };
const POSES: PhotoPose[] = ['front', 'side', 'back'];

/** Body weight against start and goal, plus front/side/back physique photos. */
export function BodySection({ since, onLogWeight }: { since: number; onLogWeight: () => void }) {
  const { t, dateShort } = useT();
  const weighIns = useStore((s) => s.weighIns);
  const goals = useStore((s) => s.goals);
  const units = useStore((s) => s.settings.units);

  const w = useMemo(() => {
    const all = [...weighIns].sort((a, b) => a.date.localeCompare(b.date));
    const sinceKey = dayKey(new Date(since));
    const inRange = all.filter((x) => x.date >= sinceKey);
    return { all, inRange, first: all[0], last: all[all.length - 1] };
  }, [weighIns, since]);

  const target = goals.targetWeight;
  const progress = w.first && w.last && w.first.kg !== target ? (w.first.kg - w.last.kg) / (w.first.kg - target) : 0;
  const change = w.inRange.length >= 2 ? w.inRange[w.inRange.length - 1].kg - w.inRange[0].kg : undefined;
  const good = change != null && Math.sign(change) === Math.sign(target - (w.first?.kg ?? target));
  const points = w.inRange.map((x) => ({ x: fromKey(x.date).getTime(), y: toDisplayWeight(x.kg, units) }));

  return (
    <View>
      <SectionTitle style={SECTION} title={t('progress.body')} aside={t('quick.logWeight')} onAside={onLogWeight} />
      <Card style={styles.card}>
        {w.last ? (
          <>
            <View style={styles.headRow}>
              <View>
                <Text style={styles.muted}>{t('progress.currentWeight')}</Text>
                <Text style={styles.big}>{formatBodyWeight(w.last.kg, units)}</Text>
              </View>
              {change != null && Math.abs(change) >= 0.05 && (
                <Text style={[styles.delta, { color: good ? colors.success : colors.textSecondary }]}>
                  {`${change > 0 ? '+' : '−'}${formatNumber(Math.abs(toDisplayWeight(change, units)), 1)} ${units}`}
                </Text>
              )}
            </View>
            <View style={{ gap: space.xs }}>
              <ProgressBar value={progress} color={colors.accent} height={8} />
              <View style={styles.headRow}>
                <Text style={styles.muted}>{t('progress.startWeight', { w: formatBodyWeight(w.first.kg, units) })}</Text>
                <Text style={styles.muted}>{t('progress.targetWeight', { w: formatBodyWeight(target, units) })}</Text>
              </View>
            </View>
            {points.length >= 2 && (
              <LineChart
                id="weight"
                points={points}
                height={120}
                format={(v) => formatNumber(v, 1)}
                reference={{ y: toDisplayWeight(target, units), label: `${t('progress.goal')} ${formatBodyWeight(target, units)}` }}
                xLabels={[points[0], points[points.length - 1]].map((p) => ({ x: p.x, label: dateShort(new Date(p.x)) }))}
              />
            )}
          </>
        ) : (
          <View style={styles.emptyRow}>
            <Text style={[styles.muted, { flex: 1 }]}>{t('progress.noData')}</Text>
            <Button label={t('quick.logWeight')} icon={ScalesIcon} size="sm" variant="secondary" onPress={onLogWeight} />
          </View>
        )}
      </Card>
      <PhotosCard />
    </View>
  );
}

function PhotosCard() {
  const { t, tn, dateShort } = useT();
  const photos = useStore((s) => s.photos);
  const every = useStore((s) => s.settings.photoEveryDays);
  const addPhoto = useStore((s) => s.addPhoto);
  const [error, setError] = useState(false);

  const sorted = useMemo(() => [...photos].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)), [photos]);
  // Latest photo for each pose; photos saved before poses existed count as front.
  const latest = (pose: PhotoPose) => sorted.find((p) => (p.pose ?? 'front') === pose);
  const slots = POSES.map((pose) => ({ pose, photo: latest(pose) }));
  const inSlots = new Set(slots.map((s) => s.photo?.id).filter(Boolean));
  const older = sorted.filter((p) => !inSlots.has(p.id));
  const dueIn = photoDueIn(photos, every);
  const everyLabel = every === 7 ? t('photo.every7') : every === 14 ? t('photo.every14') : t('photo.every30');

  const add = async (pose: PhotoPose) => {
    setError(false);
    try {
      const p = await pickPhoto();
      if (p) addPhoto({ ...p, pose });
    } catch {
      setError(true);
    }
  };
  const poseLabel = (p: PhotoPose) => t(p === 'front' ? 'progress.poseFront' : p === 'side' ? 'progress.poseSide' : 'progress.poseBack');

  return (
    <Card style={[styles.card, { marginTop: space.md }]}>
      <View style={styles.headRow}>
        <Text style={styles.title}>{t('progress.photos')}</Text>
        <Text style={styles.muted}>{photos.length ? `${everyLabel} · ${dueIn <= 0 ? t('photo.due') : tn('photo.dueIn', dueIn)}` : everyLabel}</Text>
      </View>
      {error && <Notice text={t('photo.denied')} icon={CameraIcon} />}
      <View style={styles.slots}>
        {slots.map(({ pose, photo }) =>
          photo ? (
            <Pressable key={pose} style={styles.slot} onPress={() => router.push(`/photo/${photo.id}`)} accessibilityRole="imagebutton" accessibilityLabel={poseLabel(pose)}>
              <Image source={{ uri: photo.uri }} style={styles.img} resizeMode="cover" />
              <View style={styles.tag}>
                <Text style={styles.tagText}>
                  {poseLabel(pose)} · {dateShort(fromKey(photo.date))}
                </Text>
              </View>
            </Pressable>
          ) : (
            <Pressable key={pose} style={[styles.slot, styles.empty]} onPress={() => add(pose)} accessibilityRole="button" accessibilityLabel={`${t('progress.addPhoto')}: ${poseLabel(pose)}`}>
              <PersonSimpleIcon size={22} color={colors.textSecondary} />
              <Text style={styles.muted}>{poseLabel(pose)}</Text>
              <PlusIcon size={14} color={colors.accent} weight="bold" />
            </Pressable>
          ),
        )}
      </View>
      {slots.some((s) => s.photo) && (
        <View style={styles.addRow}>
          {POSES.map((pose) => (
            <Pressable key={pose} onPress={() => add(pose)} style={styles.addChip} accessibilityRole="button">
              <PlusIcon size={12} color={colors.accent} weight="bold" />
              <Text style={styles.addText}>{poseLabel(pose)}</Text>
            </Pressable>
          ))}
        </View>
      )}
      {older.length > 0 && (
        <View style={{ gap: space.sm }}>
          <Text style={styles.muted}>{t('progress.olderPhotos')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
            {older.map((p: Photo) => (
              <Pressable key={p.id} onPress={() => router.push(`/photo/${p.id}`)} accessibilityRole="imagebutton" accessibilityLabel={dateShort(fromKey(p.date))}>
                <Image source={{ uri: p.uri }} style={styles.thumb} resizeMode="cover" />
                <Text style={styles.thumbDate}>{dateShort(fromKey(p.date))}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: space.md, gap: space.md },
  headRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: space.sm },
  title: { fontFamily: fonts.semibold, fontSize: 16, color: colors.textPrimary },
  muted: { ...type.caption, fontSize: 13, color: colors.textSecondary },
  big: { fontFamily: fonts.bold, fontSize: 28, lineHeight: 32, color: colors.textPrimary },
  delta: { fontFamily: fonts.semibold, fontSize: 14 },
  emptyRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  slots: { flexDirection: 'row', gap: space.sm },
  slot: { flex: 1, aspectRatio: 3 / 4, borderRadius: radius.md, overflow: 'hidden' },
  empty: { borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.cardStroke, alignItems: 'center', justifyContent: 'center', gap: 4 },
  img: { width: '100%', height: '100%', backgroundColor: colors.control },
  tag: { position: 'absolute', left: 6, bottom: 6, right: 6, backgroundColor: colors.scrim, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 3 },
  tagText: { ...type.caption, fontSize: 10, color: colors.textPrimary },
  addRow: { flexDirection: 'row', gap: space.sm },
  addChip: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: colors.control },
  addText: { ...type.caption, color: colors.textPrimary },
  thumb: { width: 64, height: 85, borderRadius: radius.sm, backgroundColor: colors.control },
  thumbDate: { ...type.caption, fontSize: 10, color: colors.textSecondary, marginTop: 2 },
});
