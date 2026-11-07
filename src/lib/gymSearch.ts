// Gym search over OpenStreetMap: free, worldwide, no API key.
// - by name: Photon (komoot), a geocoder over OSM data, filtered to fitness places and biased to the user's position
// - nearby: Overpass API, every `leisure=fitness_centre` within a radius
// Both send CORS headers, so the same code works in Expo Go and on web.

import type { GymKind } from '../data/types';
import { distanceM, type Position } from './gyms';

export type GymPlace = {
  /** 'osm:node:123' / 'osm:way:…' / 'osm:relation:…' */
  id: string;
  name: string;
  address?: string;
  city?: string;
  lat: number;
  lng: number;
  brand?: string;
  /** Metres from the user, when their position is known. */
  distanceM?: number;
  /** Suggested size, from the chain name. The user can change it. */
  suggestedKind: Exclude<GymKind, 'garage'>;
};

const PHOTON = 'https://photon.komoot.io/api/';
const OVERPASS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter', 'https://overpass.private.coffee/api/interpreter'];

// Chains with big, fully equipped clubs. Anything else (independent gyms, 24/7 studios, CrossFit boxes) defaults to "small".
const LARGE_CHAINS = [
  'zdrofit', 'mcfit', 'cityfit', 'calypso', 'jatomi', 'platinium', 'fitness academy', 'gold\'s gym', 'golds gym', 'world class', 'holmes place',
  'basic-fit', 'basic fit', 'puregym', 'pure gym', 'the gym group', 'john reed', 'clever fit', 'fitinn', 'fit inn', 'virgin active', 'david lloyd',
  'planet fitness', 'la fitness', '24 hour fitness', 'equinox', 'life time', 'lifetime fitness', 'crunch', 'fitness park', 'smartfit', 'smart fit',
  'urban gym', 'energy fitness', 'xtreme fitness', 'just gym', 'fitness first',
];

const fold = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ł/g, 'l');

export function suggestKind(name: string, brand?: string): 'large' | 'small' {
  const n = fold(`${brand ?? ''} ${name}`);
  return LARGE_CHAINS.some((c) => n.includes(c)) ? 'large' : 'small';
}

const OSM_TYPE: Record<string, string> = { N: 'node', W: 'way', R: 'relation' };

async function getJson(url: string, init: RequestInit = {}, timeoutMs = 12000): Promise<any> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

function withDistance(p: Omit<GymPlace, 'distanceM'>, near?: Position | null): GymPlace {
  return near ? { ...p, distanceM: Math.round(distanceM(near, p)) } : p;
}

/** Gyms whose name matches `query`, anywhere in the world, nearest first when `near` is given. */
export async function searchGymsByName(query: string, near?: Position | null): Promise<GymPlace[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const params = new URLSearchParams({ q, limit: '20' });
  params.append('osm_tag', 'leisure:fitness_centre');
  params.append('osm_tag', 'leisure:sports_centre');
  if (near) {
    params.set('lat', String(near.lat));
    params.set('lon', String(near.lng));
  }
  const data = await getJson(`${PHOTON}?${params}`);
  const out: GymPlace[] = [];
  for (const f of data?.features ?? []) {
    const p = f.properties ?? {};
    const [lng, lat] = f.geometry?.coordinates ?? [];
    if (!p.name || typeof lat !== 'number') continue;
    const street = [p.street, p.housenumber].filter(Boolean).join(' ');
    out.push(
      withDistance(
        {
          id: `osm:${OSM_TYPE[p.osm_type] ?? p.osm_type}:${p.osm_id}`,
          name: p.name,
          address: street || undefined,
          city: p.city ?? p.town ?? p.village ?? p.county,
          lat,
          lng,
          suggestedKind: suggestKind(p.name),
        },
        near,
      ),
    );
  }
  return dedupe(out);
}

/** Named gyms within `radiusM` of `pos`, nearest first. Tries a few public Overpass servers. */
export async function nearbyGyms(pos: Position, radiusM = 3000): Promise<GymPlace[]> {
  const ql = `[out:json][timeout:20];nwr["leisure"="fitness_centre"]["name"](around:${radiusM},${pos.lat},${pos.lng});out center tags 60;`;
  let data: any = null;
  let lastErr: unknown;
  for (const url of OVERPASS) {
    try {
      data = await getJson(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(ql)}`,
      });
      break;
    } catch (e) {
      lastErr = e;
    }
  }
  if (!data) throw lastErr ?? new Error('overpass');
  const out: GymPlace[] = [];
  for (const el of data.elements ?? []) {
    const tags = el.tags ?? {};
    const lat = el.lat ?? el.center?.lat;
    const lng = el.lon ?? el.center?.lon;
    if (!tags.name || typeof lat !== 'number') continue;
    const street = [tags['addr:street'] ?? tags['addr:place'], tags['addr:housenumber']].filter(Boolean).join(' ');
    out.push(
      withDistance(
        {
          id: `osm:${el.type}:${el.id}`,
          name: tags.name,
          brand: tags.brand,
          address: street || undefined,
          city: tags['addr:city'],
          lat,
          lng,
          suggestedKind: suggestKind(tags.name, tags.brand),
        },
        pos,
      ),
    );
  }
  return dedupe(out).sort((a, b) => (a.distanceM ?? 0) - (b.distanceM ?? 0));
}

function dedupe(list: GymPlace[]) {
  const seen = new Set<string>();
  return list.filter((g) => (seen.has(g.id) ? false : (seen.add(g.id), true)));
}

export function formatDistance(m: number | undefined, lang: 'en' | 'pl' = 'en') {
  if (m == null) return '';
  if (m < 1000) return `${Math.round(m / 10) * 10} m`;
  const km = (m / 1000).toFixed(m < 10000 ? 1 : 0);
  return `${lang === 'pl' ? km.replace('.', ',') : km} km`;
}
