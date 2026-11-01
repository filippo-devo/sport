import * as Location from 'expo-location';

import type { Position } from './gyms';

export type LocationOutcome = { position: Position | null; denied: boolean };

/** One foreground fix for a check-in. Never throws: no permission or no fix gives `position: null`. */
export async function currentPosition(timeoutMs = 12000): Promise<LocationOutcome> {
  try {
    const perm = await Location.requestForegroundPermissionsAsync();
    if (!perm.granted) return { position: null, denied: true };
    const fix = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs)),
    ]);
    const last = fix ?? (await Location.getLastKnownPositionAsync({ maxAge: 5 * 60 * 1000 }));
    if (!last) return { position: null, denied: false };
    return { position: { lat: last.coords.latitude, lng: last.coords.longitude, accuracyM: last.coords.accuracy ?? undefined }, denied: false };
  } catch {
    return { position: null, denied: false };
  }
}
