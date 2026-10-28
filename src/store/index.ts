import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import { useSyncExternalStore } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { EXERCISE_BY_ID } from '../data/exercises';
import { PROGRAMS } from '../data/programs';
import { sampleMeals, sampleSessions, sampleWeighIns } from '../data/sample';
import type {
  ActiveWorkout,
  Goals,
  Lang,
  MealEntry,
  Photo,
  Session,
  SessionExercise,
  SetEntry,
  Settings,
  WeighIn,
} from '../data/types';
import { dayKey } from '../lib/date';
import { getRoutine, lastPerformance } from './derived';

type Data = {
  settings: Settings;
  goals: Goals;
  activeProgramId: string;
  sessions: Session[];
  active: ActiveWorkout | null;
  weighIns: WeighIn[];
  photos: Photo[];
  meals: MealEntry[];
  hasSampleData: boolean;
};

type Actions = {
  setSettings: (patch: Partial<Settings>) => void;
  setGoals: (patch: Partial<Goals>) => void;
  setActiveProgram: (id: string) => void;

  startWorkout: (routineId?: string) => void;
  updateSet: (ex: number, set: number, patch: Partial<SetEntry>) => void;
  toggleSet: (ex: number, set: number) => void;
  addSet: (ex: number) => void;
  removeSet: (ex: number, set: number) => void;
  addExercise: (exerciseId: string) => void;
  removeExercise: (ex: number) => void;
  adjustRest: (deltaSec: number) => void;
  skipRest: () => void;
  finishWorkout: () => string | null;
  discardWorkout: () => void;
  deleteSession: (id: string) => void;

  logWeight: (kg: number, date?: string) => void;
  addPhoto: (photo: Photo) => void;
  deletePhoto: (id: string) => void;
  deleteMeal: (id: string) => void;

  clearSampleData: () => void;
  resetAll: () => void;
};

export type AppState = Data & Actions;

const deviceLang = (): Lang => (getLocales()[0]?.languageCode === 'pl' ? 'pl' : 'en');

const DEFAULT_GOALS: Goals = {
  kcal: 2400,
  protein: 160,
  carbs: 260,
  fat: 75,
  targetWeight: 79,
  workoutsPerWeek: 4,
  steps: 10000,
};

function initialData(withSample: boolean): Data {
  const now = new Date();
  return {
    settings: { name: '', lang: deviceLang(), units: 'kg', restSec: 90, haptics: true },
    goals: DEFAULT_GOALS,
    activeProgramId: PROGRAMS[0].id,
    sessions: withSample ? sampleSessions(now) : [],
    active: null,
    weighIns: withSample ? sampleWeighIns(now) : [],
    photos: [],
    meals: withSample ? sampleMeals(now) : [],
    hasSampleData: withSample,
  };
}

const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

function emptySets(n: number): SetEntry[] {
  return Array.from({ length: n }, () => ({ done: false }));
}

/** Fills empty fields from the previous session's matching set (Hevy-style "tap ✓ to repeat"). */
function filledFromPrevious(set: SetEntry, prev?: SetEntry): SetEntry {
  return {
    ...set,
    weight: set.weight ?? prev?.weight,
    reps: set.reps ?? prev?.reps,
    seconds: set.seconds ?? prev?.seconds,
  };
}

function targetDefaults(ex: SessionExercise): SetEntry {
  const tracking = EXERCISE_BY_ID[ex.exerciseId]?.tracking;
  const n = parseInt(ex.target ?? '', 10);
  if (!Number.isFinite(n)) return { done: false };
  return tracking === 'time' ? { seconds: n, done: false } : { reps: n, done: false };
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => {
      const patchActive = (fn: (a: ActiveWorkout) => ActiveWorkout) => {
        const a = get().active;
        if (a) set({ active: fn(a) });
      };
      const patchExercise = (i: number, fn: (e: SessionExercise) => SessionExercise) =>
        patchActive((a) => ({ ...a, exercises: a.exercises.map((e, j) => (j === i ? fn(e) : e)) }));

      return {
        ...initialData(true),

        setSettings: (patch) => set({ settings: { ...get().settings, ...patch } }),
        setGoals: (patch) => set({ goals: { ...get().goals, ...patch } }),
        setActiveProgram: (id) => set({ activeProgramId: id }),

        startWorkout: (routineId) => {
          if (get().active) return;
          const routine = getRoutine(routineId);
          set({
            active: {
              id: uid(),
              name: routine?.name ?? { en: 'Workout', pl: 'Trening' },
              routineId: routine?.id,
              startedAt: Date.now(),
              rest: null,
              exercises: (routine?.items ?? []).map((item) => ({
                exerciseId: item.exerciseId,
                target: item.target,
                restSec: item.restSec,
                sets: emptySets(item.sets),
              })),
            },
          });
        },

        updateSet: (ex, i, patch) =>
          patchExercise(ex, (e) => ({ ...e, sets: e.sets.map((s, j) => (j === i ? { ...s, ...patch } : s)) })),

        toggleSet: (ex, i) => {
          const a = get().active;
          if (!a) return;
          const e = a.exercises[ex];
          const s = e.sets[i];
          if (s.done) {
            patchExercise(ex, (x) => ({ ...x, sets: x.sets.map((y, j) => (j === i ? { ...y, done: false } : y)) }));
            return;
          }
          const prev = lastPerformance(get().sessions, e.exerciseId)?.sets[i];
          const filled = filledFromPrevious(filledFromPrevious(s, prev), { ...targetDefaults(e), ...(i > 0 ? e.sets[i - 1] : {}) });
          const duration = e.restSec || get().settings.restSec;
          set({
            active: {
              ...a,
              exercises: a.exercises.map((x, j) =>
                j === ex ? { ...x, sets: x.sets.map((y, k) => (k === i ? { ...filled, done: true } : y)) } : x,
              ),
              rest: { endsAt: Date.now() + duration * 1000, duration },
            },
          });
        },

        addSet: (ex) => patchExercise(ex, (e) => ({ ...e, sets: [...e.sets, { done: false }] })),
        removeSet: (ex, i) => patchExercise(ex, (e) => ({ ...e, sets: e.sets.filter((_, j) => j !== i) })),

        addExercise: (exerciseId) =>
          patchActive((a) => ({
            ...a,
            exercises: [...a.exercises, { exerciseId, restSec: get().settings.restSec, sets: emptySets(3) }],
          })),
        removeExercise: (ex) => patchActive((a) => ({ ...a, exercises: a.exercises.filter((_, j) => j !== ex) })),

        adjustRest: (delta) =>
          patchActive((a) => {
            if (!a.rest) return a;
            const endsAt = Math.max(Date.now(), a.rest.endsAt + delta * 1000);
            return { ...a, rest: { endsAt, duration: Math.max(1, a.rest.duration + delta) } };
          }),
        skipRest: () => patchActive((a) => ({ ...a, rest: null })),

        finishWorkout: () => {
          const a = get().active;
          if (!a) return null;
          const exercises = a.exercises
            .map((e) => ({ ...e, sets: e.sets.filter((s) => s.done) }))
            .filter((e) => e.sets.length > 0);
          if (!exercises.length) {
            set({ active: null });
            return null;
          }
          const session: Session = {
            id: a.id,
            name: a.name,
            routineId: a.routineId,
            startedAt: a.startedAt,
            endedAt: Date.now(),
            exercises,
          };
          set({ sessions: [...get().sessions, session], active: null });
          return session.id;
        },
        discardWorkout: () => set({ active: null }),
        deleteSession: (id) => set({ sessions: get().sessions.filter((s) => s.id !== id) }),

        logWeight: (kg, date = dayKey()) =>
          set({ weighIns: [...get().weighIns.filter((w) => w.date !== date), { date, kg }] }),
        addPhoto: (photo) => set({ photos: [photo, ...get().photos] }),
        deletePhoto: (id) => set({ photos: get().photos.filter((p) => p.id !== id) }),
        deleteMeal: (id) => set({ meals: get().meals.filter((m) => m.id !== id) }),

        clearSampleData: () =>
          set({
            sessions: get().sessions.filter((s) => !s.id.startsWith('sample-')),
            meals: get().meals.filter((m) => !m.id.startsWith('sample-')),
            weighIns: get().weighIns.filter((w) => !w.sample),
            hasSampleData: false,
          }),
        resetAll: () => {
          const { lang, units } = get().settings;
          const fresh = initialData(false);
          set({ ...fresh, settings: { ...fresh.settings, lang, units } });
        },
      };
    },
    {
      name: 'gamechanger',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ settings, goals, activeProgramId, sessions, active, weighIns, photos, meals, hasSampleData }) => ({
        settings,
        goals,
        activeProgramId,
        sessions,
        active,
        weighIns,
        photos,
        meals,
        hasSampleData,
      }),
    },
  ),
);

/** True once persisted data has been loaded from storage. */
export function useHydrated() {
  return useSyncExternalStore(
    (onChange) => useStore.persist.onFinishHydration(onChange),
    () => useStore.persist.hasHydrated(),
    () => false,
  );
}
