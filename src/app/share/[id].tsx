import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState, type ComponentRef } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { CameraIcon, CheckIcon, DownloadSimpleIcon, ImagesIcon, InstagramLogoIcon, ListChecksIcon, XIcon } from '../../components/icons';
import { ShareCard } from '../../components/share/ShareCard';
import { Button, Chip, IconButton, Segmented } from '../../components/ui/controls';
import { NavBar } from '../../components/ui/headers';
import { Screen, useLayout } from '../../components/ui/layout';
import { useT } from '../../i18n';
import { captureShareImage, estimateKcal, pickSharePhoto, saveImage, shareImage, takeSharePhoto, type ShareFormat } from '../../lib/share';
import { useStore } from '../../store';
import { colors, space, type } from '../../theme/tokens';

/** Post-workout share: add a photo, preview the graphic, send it to Instagram or save it. */
export default function ShareScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useT();
  const { contentWidth } = useLayout();
  const session = useStore((s) => s.sessions.find((x) => x.id === id));
  const weighIns = useStore((s) => s.weighIns);
  const cardRef = useRef<ComponentRef<typeof View>>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [format, setFormat] = useState<ShareFormat>('story');
  const [showExercises, setShowExercises] = useState(true);
  const [busy, setBusy] = useState<'share' | 'save' | null>(null);
  const [status, setStatus] = useState<{ text: string; ok: boolean } | null>(null);

  if (!session) return <Screen top={<NavBar />}>{null}</Screen>;
  const kcal = estimateKcal(session, weighIns);
  // Story preview is tall: keep it under ~60% of a typical phone height so the buttons stay in reach.
  const cardWidth = format === 'story' ? Math.min(contentWidth, 300) : Math.min(contentWidth, 340);

  const run = async (kind: 'share' | 'save') => {
    setBusy(kind);
    setStatus(null);
    try {
      const uri = await captureShareImage(cardRef, format);
      if (kind === 'share') {
        const ok = await shareImage(uri, t('share.title'));
        if (!ok) setStatus({ text: t('share.unavailable'), ok: false });
      } else {
        const res = await saveImage(uri);
        setStatus(res === 'saved' ? { text: t('share.saved'), ok: true } : { text: t('share.denied'), ok: false });
      }
    } catch {
      setStatus({ text: t('share.failed'), ok: false });
    } finally {
      setBusy(null);
    }
  };

  const addPhoto = async (from: 'camera' | 'library') => {
    const uri = from === 'camera' ? await takeSharePhoto() : await pickSharePhoto();
    if (uri) setPhoto(uri);
  };

  return (
    <Screen top={<NavBar title={t('share.title')} left={<IconButton icon={XIcon} label={t('common.close')} onPress={() => router.back()} />} />}>
      <Segmented
        options={[
          { value: 'story', label: t('share.story') },
          { value: 'post', label: t('share.post') },
        ]}
        value={format}
        onChange={setFormat}
      />

      <View style={styles.preview}>
        {/* Rounded only on screen: the exported image keeps square corners. */}
        <View style={styles.clip}>
          <ShareCard ref={cardRef} session={session} kcal={kcal} photo={photo} format={format} showExercises={showExercises} width={cardWidth} />
        </View>
      </View>

      <View style={styles.row}>
        {Platform.OS !== 'web' && (
          <Button label={t('share.takePhoto')} icon={CameraIcon} variant="secondary" size="sm" onPress={() => addPhoto('camera')} style={styles.flex} />
        )}
        <Button label={t('share.fromLibrary')} icon={ImagesIcon} variant="secondary" size="sm" onPress={() => addPhoto('library')} style={styles.flex} />
      </View>
      <View style={styles.chips}>
        <Chip label={t('share.showExercises')} icon={ListChecksIcon} selected={showExercises} onPress={() => setShowExercises((v) => !v)} />
        {photo && <Chip label={t('share.removePhoto')} icon={XIcon} onPress={() => setPhoto(null)} />}
      </View>

      <Text style={styles.note}>{t('share.kcalNote')}</Text>

      <Button
        label={Platform.OS === 'web' ? t('share.download') : t('share.instagram')}
        icon={Platform.OS === 'web' ? DownloadSimpleIcon : InstagramLogoIcon}
        loading={busy === 'share'}
        disabled={!!busy}
        onPress={() => run('share')}
        style={styles.cta}
      />
      {Platform.OS !== 'web' && (
        <Button label={t('share.download')} icon={DownloadSimpleIcon} variant="secondary" loading={busy === 'save'} disabled={!!busy} onPress={() => run('save')} style={styles.second} />
      )}
      {status && (
        <View style={styles.status}>
          {status.ok && <CheckIcon size={16} color={colors.success} weight="bold" />}
          <Text style={[styles.statusText, { color: status.ok ? colors.success : colors.warning }]}>{status.text}</Text>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  preview: { alignItems: 'center', marginTop: space.lg },
  clip: { borderRadius: 16, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, borderColor: colors.cardStroke },
  row: { flexDirection: 'row', gap: space.sm, marginTop: space.lg },
  flex: { flex: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.md },
  note: { ...type.caption, color: colors.textSecondary, marginTop: space.md },
  cta: { marginTop: space.xl },
  second: { marginTop: space.sm },
  status: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.xs, marginTop: space.md },
  statusText: { ...type.body },
});
