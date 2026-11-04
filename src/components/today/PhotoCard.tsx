import { router } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { useT } from '../../i18n';
import { fromKey } from '../../lib/date';
import { pickPhoto } from '../../lib/photos';
import { photoDueIn } from '../../lib/today';
import { useStore } from '../../store';
import { colors, fonts, radius, space, type } from '../../theme/tokens';
import { CameraIcon, PlusIcon } from '../icons';
import { Card } from '../ui/controls';

/** Progress photo on Today, at the frequency set in Edit Today (MacroFactor / Future pattern). */
export function PhotoCard() {
  const { t, tn, dateShort } = useT();
  const photos = useStore((s) => s.photos);
  const every = useStore((s) => s.settings.photoEveryDays);
  const addPhoto = useStore((s) => s.addPhoto);
  const [error, setError] = useState(false);

  const dueIn = photoDueIn(photos, every);
  const recent = [...photos].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 2);
  const last = recent[0];

  const add = async () => {
    setError(false);
    try {
      const p = await pickPhoto();
      if (p) addPhoto(p);
    } catch {
      setError(true);
    }
  };

  return (
    <Card style={[styles.card, dueIn <= 0 && styles.due]}>
      <View style={styles.head}>
        <View style={styles.icon}>
          <CameraIcon size={20} color={dueIn <= 0 ? colors.accent : colors.textPrimary} weight="fill" />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.title}>{dueIn <= 0 ? t('photo.due') : tn('photo.dueIn', dueIn)}</Text>
          <Text style={styles.sub}>{last ? t('photo.last', { date: dateShort(fromKey(last.date)) }) : t('photo.none')}</Text>
        </View>
      </View>
      <View style={styles.row}>
        <Pressable onPress={add} style={({ pressed }) => [styles.tile, styles.add, pressed && { opacity: 0.8 }]} accessibilityRole="button" accessibilityLabel={t('progress.addPhoto')}>
          <PlusIcon size={22} color={colors.accent} weight="bold" />
          <Text style={styles.addText}>{t('progress.addPhoto')}</Text>
        </Pressable>
        {recent.map((p) => (
          <Pressable key={p.id} onPress={() => router.push(`/photo/${p.id}`)} style={styles.tile} accessibilityRole="button" accessibilityLabel={dateShort(fromKey(p.date))}>
            <Image source={{ uri: p.uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
            <Text style={styles.date}>{dateShort(fromKey(p.date))}</Text>
          </Pressable>
        ))}
        {Array.from({ length: Math.max(0, 2 - recent.length) }, (_, i) => (
          <View key={i} style={[styles.tile, styles.empty]} />
        ))}
      </View>
      {error && <Text style={styles.error}>{t('photo.error')}</Text>}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: space.md },
  due: { borderColor: colors.accentStroke },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  icon: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.control, alignItems: 'center', justifyContent: 'center' },
  title: { ...type.itemTitle, fontFamily: fonts.semibold, color: colors.textPrimary },
  sub: { ...type.caption, fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  row: { flexDirection: 'row', gap: space.sm },
  tile: { flex: 1, aspectRatio: 0.85, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.control, justifyContent: 'flex-end' },
  add: { backgroundColor: 'transparent', borderWidth: 1.5, borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center', gap: space.xs },
  addText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.accent },
  empty: { opacity: 0.5 },
  date: { ...type.caption, color: colors.textPrimary, padding: space.sm, textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 4 },
  error: { ...type.caption, color: colors.danger },
});
