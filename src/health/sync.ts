import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { FOOD_BY_ID } from '../data/foods';
import type { MealEntry, Session, WaterEntry, WeighIn } from '../data/types';
import { addDays, dayKey, fromKey } from '../lib/date';
import { useStore } from '../store';
import { entryNutrients, latestWeighIn } from '../store/derived';
import { T, healthKit, requestHealthAccess, type HK } from './healthkit';

// Two-way Apple Health sync.
// Out: finished workouts, meals (kcal + macros), water and weigh-ins become Health samples.
//      Every local record remembers the Health sample ids it produced, so an edit
//      replaces them and a delete removes them.
// In:  weigh-ins from other apps (a smart scale) are imported into the weight log.

type TypeId = (typeof T)[keyof typeof T];
type Link = { sig: string; uuids: Partial<Record<TypeId, string[]>> };

type HealthState = {
  links: Record<string, Link>;
  lastSync?: number;
  error?: string;
};

export const useHealthStore = create<HealthState>()(
  persist(() => ({ links: {} }) as HealthState, {
    name: 'gamechanger-health',
    version: 1,
    storage: createJSONStorage(() => AsyncStorage),
  }),
);

/** How far back the first sync copies existing records. */
const BACKFILL_DAYS = 90;
/** MET for general weight training, used to estimate workout calories. */
const STRENGTH_MET = 5;

type Item = { key: string; sig: string; date: number; save: (hk: HK) => Promise<Link['uuids']> };

const at = (key: string, time = '08:00') => {
  const d = fromKey(key);
  const [h, m] = time.split(':').map(Number);
  d.setHours(h || 0, m || 0, 0, 0);
  return d;
};

function sessionItem(s: Session, bodyKg: number): Item {
  const start = new Date(s.startedAt);
  const end = new Date(Math.max(s.endedAt, s.startedAt + 60_000));
  const kcal = Math.round(STRENGTH_MET * bodyKg * ((end.getTime() - start.getTime()) / 3_600_000));
  return {
    key: `s:${s.id}`,
    sig: `${s.startedAt}-${s.endedAt}-${kcal}`,
    date: s.startedAt,
    save: async (hk) => {
      const w = await hk.saveWorkoutSample(
        hk.WorkoutActivityType.traditionalStrengthTraining,
        [],
        start,
        end,
        { energyBurned: kcal },
        { HKExternalUUID: s.id, HKWorkoutBrandName: 'GameChanger' },
      );
      return { [T.workout]: [w.uuid] };
    },
  };
}

function mealItem(m: MealEntry): Item {
  const n = entryNutrients(m);
  const when = at(m.date, m.time);
  const name = m.manual?.name ?? FOOD_BY_ID[m.foodId]?.name.en;
  const meta = name ? { HKFoodType: name } : undefined;
  const parts = [
    [T.kcal, 'kcal', n.kcal],
    [T.protein, 'g', n.protein],
    [T.carbs, 'g', n.carbs],
    [T.fat, 'g', n.fat],
  ] as const;
  return {
    key: `m:${m.id}`,
    sig: parts.map((p) => p[2].toFixed(1)).join('/') + `@${m.date}T${m.time}`,
    date: when.getTime(),
    save: async (hk) => {
      const out: Link['uuids'] = {};
      for (const [type, unit, value] of parts) {
        if (value <= 0) continue;
        const r = await hk.saveQuantitySample(type, unit, value, when, when, meta);
        if (r) out[type] = [r.uuid];
      }
      return out;
    },
  };
}

function waterItem(w: WaterEntry): Item {
  const when = at(w.date, w.time);
  return {
    key: `w:${w.id}`,
    sig: `${w.ml}@${w.date}T${w.time}`,
    date: when.getTime(),
    save: async (hk) => {
      const r = await hk.saveQuantitySample(T.water, 'mL', w.ml, when, when);
      return r ? { [T.water]: [r.uuid] } : {};
    },
  };
}

function weightItem(w: WeighIn): Item {
  const when = w.date === dayKey() ? new Date() : at(w.date);
  return {
    key: `b:${w.date}`,
    sig: w.kg.toFixed(2),
    date: when.getTime(),
    save: async (hk) => {
      const r = await hk.saveQuantitySample(T.bodyMass, 'kg', w.kg, when, when);
      return r ? { [T.bodyMass]: [r.uuid] } : {};
    },
  };
}

function localItems(): Item[] {
  const s = useStore.getState();
  const bodyKg = latestWeighIn(s.weighIns)?.kg ?? 75;
  return [
    ...s.sessions.map((x) => sessionItem(x, bodyKg)),
    ...s.meals.map(mealItem),
    ...s.water.map(waterItem),
    ...s.weighIns.filter((w) => w.source !== 'health').map(weightItem),
  ];
}

async function removeLink(hk: HK, link: Link) {
  for (const [type, uuids] of Object.entries(link.uuids) as [TypeId, string[]][]) {
    if (uuids?.length) await hk.deleteObjects(type, { uuids });
  }
}

/** Weigh-ins other apps (a smart scale, the Health app) saved in the last 60 days. */
async function importWeighIns(hk: HK, ours: Set<string>) {
  const samples = await hk.queryQuantitySamples(T.bodyMass, {
    limit: 100,
    unit: 'kg',
    ascending: false,
    filter: { date: { startDate: addDays(new Date(), -60) } },
  });
  const own = hk.currentAppSource().bundleIdentifier;
  const byDay = new Map<string, number>();
  for (const x of samples) {
    if (ours.has(x.uuid) || x.sourceRevision?.source.bundleIdentifier === own) continue;
    const key = dayKey(new Date(x.startDate));
    if (!byDay.has(key)) byDay.set(key, x.quantity); // newest of the day first
  }
  if (!byDay.size) return;
  const current = useStore.getState().weighIns;
  const have = new Set(current.map((w) => w.date));
  const added: WeighIn[] = [...byDay].filter(([d]) => !have.has(d)).map(([date, kg]) => ({ date, kg: Math.round(kg * 10) / 10, source: 'health' }));
  if (added.length) useStore.setState({ weighIns: [...current, ...added] });
}

let running: Promise<void> | null = null;
let again = false;

/** Brings Health in line with the local log. Safe to call often. */
export function syncHealth(): Promise<void> {
  if (running) {
    again = true;
    return running;
  }
  running = (async () => {
    try {
      do {
        again = false;
        await syncOnce();
      } while (again);
    } finally {
      running = null;
    }
  })();
  return running;
}

async function syncOnce() {
  const hk = healthKit();
  if (!hk || !useStore.getState().settings.health) return;
  const store = useHealthStore;
  const links = { ...store.getState().links };
  const cutoff = addDays(new Date(), -BACKFILL_DAYS).getTime();
  try {
    const items = localItems();
    const keys = new Set(items.map((i) => i.key));
    // Deleted locally → delete in Health.
    for (const [key, link] of Object.entries(links)) {
      if (keys.has(key)) continue;
      await removeLink(hk, link);
      delete links[key];
    }
    // New or edited → (re)write.
    for (const item of items) {
      const link = links[item.key];
      if (link?.sig === item.sig) continue;
      if (!link && item.date < cutoff) continue;
      if (link) await removeLink(hk, link);
      links[item.key] = { sig: item.sig, uuids: await item.save(hk) };
      store.setState({ links: { ...links } });
    }
    const ours = new Set(Object.values(links).flatMap((l) => Object.values(l.uuids).flat() as string[]));
    await importWeighIns(hk, ours);
    store.setState({ links, lastSync: Date.now(), error: undefined });
  } catch (e) {
    store.setState({ links, error: e instanceof Error ? e.message : String(e) });
  }
}

/** Turns sync on: asks for permission, then copies the last 90 days. */
export async function connectHealth(): Promise<boolean> {
  const ok = await requestHealthAccess();
  if (!ok) return false;
  useStore.getState().setSettings({ health: true });
  await syncHealth();
  return true;
}

/** Stops syncing. Samples already in Health stay there (the user manages them in the Health app). */
export function disconnectHealth() {
  useStore.getState().setSettings({ health: false });
  useHealthStore.setState({ links: {}, lastSync: undefined, error: undefined });
}

let timer: ReturnType<typeof setTimeout> | undefined;

/** Re-syncs a moment after workouts, meals, water or weight change. Call once at startup. */
export function startHealthSync(): () => void {
  if (!healthKit()) return () => {};
  const unsub = useStore.subscribe((s, prev) => {
    if (!s.settings.health) return;
    if (s.sessions === prev.sessions && s.meals === prev.meals && s.water === prev.water && s.weighIns === prev.weighIns && s.settings.health === prev.settings.health) return;
    clearTimeout(timer);
    timer = setTimeout(() => void syncHealth(), 1500);
  });
  if (useStore.getState().settings.health) {
    // Permission request is a no-op once granted, but HealthKit needs it before any query.
    void requestHealthAccess().then(() => syncHealth());
  }
  return () => {
    unsub();
    clearTimeout(timer);
  };
}
