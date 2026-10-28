import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';

import { TrashIcon } from '../../components/icons';
import { IconButton } from '../../components/ui/controls';
import { NavBar } from '../../components/ui/headers';
import { useLayout } from '../../components/ui/layout';
import { ConfirmSheet } from '../../components/ui/sheets';
import { useT } from '../../i18n';
import { fromKey } from '../../lib/date';
import { deletePhotoFile } from '../../lib/photos';
import { useStore } from '../../store';
import { colors, radius, space } from '../../theme/tokens';

/** Full-screen physique photo with delete. */
export default function PhotoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, dateLong } = useT();
  const { insets, frameWidth, gutter } = useLayout();
  const photo = useStore((s) => s.photos.find((p) => p.id === id));
  const deletePhoto = useStore((s) => s.deletePhoto);
  const [confirm, setConfirm] = useState(false);

  return (
    <View style={styles.screen}>
      <View style={{ width: frameWidth, flex: 1 }}>
        <NavBar
          title={photo ? dateLong(fromKey(photo.date)) : t('photo.title')}
          right={photo ? <IconButton icon={TrashIcon} label={t('photo.delete')} iconColor={colors.danger} onPress={() => setConfirm(true)} /> : null}
        />
        {photo && (
          <View style={[styles.imageWrap, { paddingHorizontal: gutter, paddingBottom: Math.max(insets.bottom, space.lg) }]}>
            <Image source={{ uri: photo.uri }} style={styles.image} resizeMode="contain" accessibilityLabel={t('photo.title')} />
          </View>
        )}
      </View>
      <ConfirmSheet
        visible={confirm}
        title={t('photo.delete')}
        body={t('photo.deleteBody')}
        confirmLabel={t('common.delete')}
        destructive
        onCancel={() => setConfirm(false)}
        onConfirm={() => {
          setConfirm(false);
          if (photo) {
            deletePhotoFile(photo.uri);
            deletePhoto(photo.id);
          }
          router.back();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, alignItems: 'center' },
  imageWrap: { flex: 1 },
  image: { flex: 1, borderRadius: radius.lg, backgroundColor: colors.surface },
});
