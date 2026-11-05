import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import type { ComponentRef, RefObject } from 'react';
import { Platform, type View } from 'react-native';

import type { Session, WeighIn } from '../data/types';

/** Brand line printed at the bottom of every share graphic. Change it here when the final app name is set. */
export const SHARE_BRAND = 'GAMECHANGER';

export type ShareFormat = 'story' | 'post';

/** Export size in pixels: Instagram Story 9:16 and feed post 4:5. */
export const SHARE_SIZE: Record<ShareFormat, { width: number; height: number }> = {
  story: { width: 1080, height: 1920 },
  post: { width: 1080, height: 1350 },
};

/** Body weight used when the user has never logged a weigh-in. */
const DEFAULT_KG = 75;
/** MET for resistance training at a moderate-to-vigorous effort (Compendium of Physical Activities ≈ 5.0). */
const STRENGTH_MET = 5;

/**
 * Rough calories burned: MET × body weight × hours. The app has no heart-rate data, so this is an
 * estimate and the graphic shows it with "~".
 */
export function estimateKcal(session: Session, weighIns: WeighIn[]): number {
  const latest = [...weighIns].sort((a, b) => a.date.localeCompare(b.date)).pop();
  const kg = latest?.kg ?? DEFAULT_KG;
  const hours = Math.max(0, session.endedAt - session.startedAt) / 3600000;
  return Math.round(STRENGTH_MET * kg * hours);
}

/** Takes a photo with the camera (front or back, the user switches in the system camera). */
export async function takeSharePhoto(): Promise<string | null> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) return null;
  const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.85, base64: Platform.OS === 'web' });
  return assetUri(result);
}

export async function pickSharePhoto(): Promise<string | null> {
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85, base64: Platform.OS === 'web' });
  return assetUri(result);
}

function assetUri(result: ImagePicker.ImagePickerResult): string | null {
  if (result.canceled || !result.assets?.length) return null;
  const a = result.assets[0];
  if (Platform.OS === 'web' && a.base64) return `data:${a.mimeType ?? 'image/jpeg'};base64,${a.base64}`;
  return a.uri;
}

/** Renders the share card view to a JPEG at Instagram size. Returns a file URI (native) or data URI (web). */
export async function captureShareImage(ref: RefObject<ComponentRef<typeof View> | null>, format: ShareFormat): Promise<string> {
  // Loaded lazily so a build without the native module still starts; only this action fails.
  const { captureRef } = await import('react-native-view-shot');
  const size = SHARE_SIZE[format];
  return captureRef(ref, {
    format: 'jpg',
    quality: 0.92,
    width: size.width,
    height: size.height,
    result: Platform.OS === 'web' ? 'data-uri' : 'tmpfile',
  });
}

/** Opens the system share sheet (Instagram Stories / Feed, Messages, …). */
export async function shareImage(uri: string, title: string): Promise<boolean> {
  if (Platform.OS === 'web') {
    downloadOnWeb(uri);
    return true;
  }
  const Sharing = await import('expo-sharing');
  if (!(await Sharing.isAvailableAsync())) return false;
  await Sharing.shareAsync(uri, { mimeType: 'image/jpeg', UTI: 'public.jpeg', dialogTitle: title });
  return true;
}

/** Saves the graphic to the phone's photo library (web: downloads the file). */
export async function saveImage(uri: string): Promise<'saved' | 'denied'> {
  if (Platform.OS === 'web') {
    downloadOnWeb(uri);
    return 'saved';
  }
  const MediaLibrary = await import('expo-media-library/legacy');
  const perm = await MediaLibrary.requestPermissionsAsync(true);
  if (!perm.granted) return 'denied';
  await MediaLibrary.saveToLibraryAsync(await withJpgName(uri));
  return 'saved';
}

/** Photos needs a file with an image extension; view-shot temp files already have one, this is a safety net. */
async function withJpgName(uri: string): Promise<string> {
  if (/\.(jpe?g|png)$/i.test(uri)) return uri;
  const dir = new Directory(Paths.cache, 'share');
  if (!dir.exists) dir.create({ idempotent: true, intermediates: true });
  const dest = new File(dir, `workout-${Date.now()}.jpg`);
  await new File(uri).copy(dest);
  return dest.uri;
}

function downloadOnWeb(uri: string) {
  const a = document.createElement('a');
  a.href = uri;
  a.download = `workout-${Date.now()}.jpg`;
  a.click();
}
