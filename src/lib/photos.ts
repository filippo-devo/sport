import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

import type { Photo } from '../data/types';
import { dayKey } from './date';

/**
 * Picks a photo from the library and keeps a private copy so it survives cache cleanup.
 * Web has no file system, so the image is stored inline as a data URI.
 */
export async function pickPhoto(): Promise<Photo | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.7,
    allowsEditing: false,
    base64: Platform.OS === 'web',
  });
  if (result.canceled || !result.assets?.length) return null;
  const asset = result.assets[0];
  const id = `${Date.now().toString(36)}`;

  if (Platform.OS === 'web') {
    const uri = asset.base64 ? `data:${asset.mimeType ?? 'image/jpeg'};base64,${asset.base64}` : asset.uri;
    return { id, date: dayKey(), uri };
  }

  try {
    const dir = new Directory(Paths.document, 'photos');
    if (!dir.exists) dir.create({ idempotent: true, intermediates: true });
    const ext = asset.uri.split('.').pop()?.split('?')[0] || 'jpg';
    const dest = new File(dir, `${id}.${ext}`);
    await new File(asset.uri).copy(dest);
    return { id, date: dayKey(), uri: dest.uri };
  } catch {
    return { id, date: dayKey(), uri: asset.uri };
  }
}

export function deletePhotoFile(uri: string) {
  if (Platform.OS === 'web' || !uri.startsWith('file:')) return;
  try {
    const f = new File(uri);
    if (f.exists) f.delete();
  } catch {
    // Already gone.
  }
}
