// QR check-in at partner gyms: parse the code, check it against the registry and the phone's position.

import { GYM_BY_ID } from '../data/gyms';
import type { GymVisit, PartnerGym } from '../data/types';

const PREFIX = 'gamechanger:gym:';
/** A second scan at the same gym within this window doesn't create another visit. */
export const DUPLICATE_WINDOW_MS = 3 * 60 * 60 * 1000;
/** GPS readings can be off indoors: the reported accuracy (capped) is added to the gym's radius. */
const MAX_ACCURACY_ALLOWANCE_M = 75;

/** The text encoded in a gym's QR code. */
export const gymQrPayload = (g: PartnerGym) => `${PREFIX}${g.id}:${g.code}`;

export function parseGymQr(text: string): { gymId: string; code: string } | null {
  const t = text.trim();
  if (!t.toLowerCase().startsWith(PREFIX)) return null;
  const [gymId, code] = t.slice(PREFIX.length).split(':');
  return gymId && code ? { gymId, code } : null;
}

/** Great-circle distance in metres. */
export function distanceM(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371000;
  const rad = (x: number) => (x * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export type Position = { lat: number; lng: number; accuracyM?: number };

export type CheckInResult =
  | { ok: true; gym: PartnerGym; method: GymVisit['method']; distanceM?: number }
  | { ok: false; reason: 'notGymCode' | 'unknownGym' | 'badCode' | 'needLocation' | 'tooFar' | 'duplicate'; gym?: PartnerGym; distanceM?: number; last?: GymVisit };

/**
 * Decides whether a scanned code is a valid check-in.
 * A gym with a geofence requires a position inside it; without a position the scan is refused
 * (`needLocation`) so presence is actually verified.
 */
export function verifyCheckIn(text: string, position: Position | null, visits: GymVisit[], now = Date.now()): CheckInResult {
  const parsed = parseGymQr(text);
  if (!parsed) return { ok: false, reason: 'notGymCode' };
  const gym = GYM_BY_ID[parsed.gymId];
  if (!gym) return { ok: false, reason: 'unknownGym' };
  if (gym.code !== parsed.code) return { ok: false, reason: 'badCode', gym };

  const last = [...visits].reverse().find((v) => v.gymId === gym.id);
  if (last && now - last.at < DUPLICATE_WINDOW_MS) return { ok: false, reason: 'duplicate', gym, last };

  if (!gym.location) return { ok: true, gym, method: 'qr', distanceM: undefined };
  if (!position) return { ok: false, reason: 'needLocation', gym };
  const d = distanceM(position, gym.location);
  const allowance = Math.min(MAX_ACCURACY_ALLOWANCE_M, position.accuracyM ?? 0);
  if (d > gym.location.radiusM + allowance) return { ok: false, reason: 'tooFar', gym, distanceM: Math.round(d) };
  return { ok: true, gym, method: 'qr+gps', distanceM: Math.round(d) };
}
