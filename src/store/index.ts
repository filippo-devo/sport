import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import { useSyncExternalStore } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { EXERCISE_BY_ID } from '../data/exercises';
import { PROGRAMS } from '../data/programs';
import type { CoachMessage } from '../ai/types';
import type {
  ActiveWorkout,
  Goals,
  Lang,
  ManualNutrition,
  MealEntry,
  MealType,
  Photo,
  Program,
  ReminderSettings,
  Routine,
  Session,
  SessionExercise,
  SetEntry,
  Settings,
  Supplement,
  SupplementLog,
  GymVisit,
  WaterEntry,
  WeighIn,
} from '../data/types';
import { dayKey, hhmm } from '../lib/date';
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
  /** The user's own workouts and plans (built-in ones live in data/programs). */
  routines: Routine[];
  programs: Program[];
  water: WaterEntry[];
  supplements: Supplement[];
  supplementLogs: SupplementLog[];
  reminders: ReminderSettings;
  gymVisits: GymVisit[];
  /** AI trainer conversation (kept on the device). */
  coachChat: CoachMessage[];
  /** Plans assigned by personal trainers (server id -> local plan id and version). */
  coachPlanLinks: Record<string, { localId: string; updatedAt: string }>;
};

type Actions = {
  setSettings: (patch: Partial<Settings>) => void;
  setGoals: (patch: Partial<Goals>) => void;
  setActiveProgram: (id: string) => void;
  setReminders: (patch: Partial<ReminderSettings>) => void;

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
  addFood: (entry: { foodId: string; grams: number; meal: MealType; date?: string }) => void;
  addManual: (entry: { manual: ManualNutrition; meal: MealType; date?: string }) => void;
  updateMeal: (id: string, patch: Partial<Pick<MealEntry, 'grams' | 'meal' | 'manual'>>) => void;

  saveRoutine: (routine: Routine) => string;
  deleteRoutine: (id: string) => void;
  saveProgram: (program: Program) => string;
  deleteProgram: (id: string) => void;
  saveSessionAsRoutine: (sessionId: string, name: string) => string | null;

  addWater: (ml: number, date?: string) => void;
  deleteWater: (id: string) => void;
  saveSupplement: (s: Supplement) => void;
  deleteSupplement: (id: string) => void;
  takeSupplement: (id: string, date?: string) => void;
  deleteSupplementLog: (id: string) => void;
  addGymVisit: (v: GymVisit) => void;
  addCoachMessage: (m: CoachMessage) => void;
  updateCoachMessage: (id: string, patch: Partial<CoachMessage>) => void;
  clearCoachChat: () => void;
  setCoachPlanLinks: (links: Data['coachPlanLinks']) => void;

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
  workoutsPerMonth: 16,
  steps: 10000,
  waterMl: 2500,
};

export const DEFAULT_REMINDERS: ReminderSettings = {
  workout: { on: false, time: '17:00' },
  missed: { on: false, time: '20:30' },
  water: { on: false, from: '09:00', to: '21:00', everyHours: 2 },
  supplements: { on: true },
};

function initialData(): Data {
  return {
    settings: { name: '', lang: deviceLang(), units: 'kg', restSec: 90, haptics: true },
    goals: DEFAULT_GOALS,
    activeProgramId: PROGRAMS[0].id,
    sessions: [],
    active: null,
    weighIns: [],
    photos: [],
    meals: [],
    routines: [],
    programs: [],
    water: [],
    supplements: [],
    supplementLogs: [],
    reminders: DEFAULT_REMINDERS,
    gymVisits: [],
    coachChat: [],
    coachPlanLinks: {},
  };
}

export const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

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
  const weight = tracking === 'weightReps' ? ex.weight : undefined;
  if (!Number.isFinite(n)) return { done: false, weight };
  return tracking === 'time' ? { seconds: n, done: false } : { reps: n, weight, done: false };
}

/** Upsert by id, keeping list order. */
function upsert<T extends { id: string }>(list: T[], item: T): T[] {
  return list.some((x) => x.id === item.id) ? list.map((x) => (x.id === item.id ? item : x)) : [...list, item];
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
        ...initialData(),

        setSettings: (patch) => set({ settings: { ...get().settings, ...patch } }),
        setGoals: (patch) => set({ goals: { ...get().goals, ...patch } }),
        setActiveProgram: (id) => set({ activeProgramId: id }),
        setReminders: (patch) => set({ reminders: { ...get().reminders, ...patch } }),

        startWorkout: (routineId) => {
          if (get().active) return;
          const routine = getRoutine(routineId, get().routines);
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
                weight: item.weight,
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
        addFood: ({ foodId, grams, meal, date = dayKey() }) =>
          set({ meals: [...get().meals, { id: uid(), date, meal, foodId, grams, time: hhmm() }] }),
        addManual: ({ manual, meal, date = dayKey() }) =>
          set({ meals: [...get().meals, { id: uid(), date, meal, foodId: '', grams: 0, time: hhmm(), manual }] }),
        updateMeal: (id, patch) => set({ meals: get().meals.map((m) => (m.id === id ? { ...m, ...patch } : m)) }),

        saveRoutine: (routine) => {
          const r = { ...routine, id: routine.id || uid(), source: routine.source ?? 'user' };
          set({ routines: upsert(get().routines, r) });
          return r.id;
        },
        deleteRoutine: (id) =>
          set({
            routines: get().routines.filter((r) => r.id !== id),
            programs: get().programs.map((p) => ({ ...p, schedule: p.schedule.map((x) => (x === id ? null : x)) })),
          }),
        saveProgram: (program) => {
          const p = { ...program, id: program.id || uid(), source: program.source ?? 'user' };
          set({ programs: upsert(get().programs, p) });
          return p.id;
        },
        deleteProgram: (id) => {
          const program = get().programs.find((p) => p.id === id);
          // Routines used only by this plan go with it when they were generated for it.
          const usedElsewhere = new Set(get().programs.filter((p) => p.id !== id).flatMap((p) => p.schedule));
          const orphans = new Set(
            (program?.schedule ?? []).filter((r): r is string => !!r && !usedElsewhere.has(r) && get().routines.some((x) => x.id === r && x.source !== 'user')),
          );
          set({
            programs: get().programs.filter((p) => p.id !== id),
            routines: get().routines.filter((r) => !orphans.has(r.id)),
            activeProgramId: get().activeProgramId === id ? PROGRAMS[0].id : get().activeProgramId,
          });
        },
        saveSessionAsRoutine: (sessionId, name) => {
          const s = get().sessions.find((x) => x.id === sessionId);
          if (!s) return null;
          const id = uid();
          const routine: Routine = {
            id,
            name: { en: name, pl: name },
            source: 'user',
            items: s.exercises.map((e) => {
              const top = e.sets.reduce<SetEntry | undefined>((best, x) => ((x.weight ?? 0) >= (best?.weight ?? 0) ? x : best), undefined);
              return {
                exerciseId: e.exerciseId,
                sets: e.sets.length,
                target: String(top?.reps ?? top?.seconds ?? e.target ?? 10),
                restSec: e.restSec,
                weight: top?.weight,
              };
            }),
          };
          set({ routines: [...get().routines, routine] });
          return id;
        },

        addWater: (ml, date = dayKey()) => set({ water: [...get().water, { id: uid(), date, time: hhmm(), ml }] }),
        deleteWater: (id) => set({ water: get().water.filter((w) => w.id !== id) }),
        saveSupplement: (supp) => set({ supplements: upsert(get().supplements, { ...supp, id: supp.id || uid() }) }),
        deleteSupplement: (id) =>
          // Keep the history readable: archive instead of deleting when it was ever taken.
          set({
            supplements: get().supplementLogs.some((l) => l.supplementId === id)
              ? get().supplements.map((x) => (x.id === id ? { ...x, archived: true, reminders: false } : x))
              : get().supplements.filter((x) => x.id !== id),
          }),
        takeSupplement: (id, date = dayKey()) => {
          const supp = get().supplements.find((x) => x.id === id);
          if (!supp) return;
          set({ supplementLogs: [...get().supplementLogs, { id: uid(), supplementId: id, name: supp.name, dose: supp.dose, date, time: hhmm() }] });
        },
        deleteSupplementLog: (id) => set({ supplementLogs: get().supplementLogs.filter((l) => l.id !== id) }),
        addGymVisit: (v) => set({ gymVisits: [...get().gymVisits, v] }),
        addCoachMessage: (m) => set({ coachChat: [...get().coachChat, m].slice(-100) }),
        updateCoachMessage: (id, patch) => set({ coachChat: get().coachChat.map((m) => (m.id === id ? { ...m, ...patch } : m)) }),
        clearCoachChat: () => set({ coachChat: [] }),
        setCoachPlanLinks: (coachPlanLinks) => set({ coachPlanLinks }),

        resetAll: () => {
          const { lang, units } = get().settings;
          const fresh = initialData();
          set({ ...fresh, settings: { ...fresh.settings, lang, units } });
        },
      };
    },
    {
      name: 'gamechanger',
      version: 2,
      storage: createJSONStorage(() => AsyncStorage),
      // v1 shipped with generated sample history; statistics must come from real entries only.
      migrate: (persisted, version) => {
        const state = (persisted ?? {}) as Partial<Data> & { hasSampleData?: boolean };
        if (version < 2) {
          state.sessions = (state.sessions ?? []).filter((x) => !x.id.startsWith('sample-'));
          state.meals = (state.meals ?? []).filter((x) => !x.id.startsWith('sample-'));
          state.weighIns = (state.weighIns ?? []).filter((x) => !(x as { sample?: boolean }).sample);
          delete state.hasSampleData;
        }
        return state as Data;
      },
      // Goals gain fields over time: merge them so older saves pick up the new defaults.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<Data>;
        return {
          ...current,
          ...p,
          goals: { ...current.goals, ...p.goals },
          settings: { ...current.settings, ...p.settings },
          reminders: { ...current.reminders, ...p.reminders },
        };
      },
      partialize: (s) => {
        const data: Data = {
          settings: s.settings,
          goals: s.goals,
          activeProgramId: s.activeProgramId,
          sessions: s.sessions,
          active: s.active,
          weighIns: s.weighIns,
          photos: s.photos,
          meals: s.meals,
          routines: s.routines,
          programs: s.programs,
          water: s.water,
          supplements: s.supplements,
          supplementLogs: s.supplementLogs,
          reminders: s.reminders,
          gymVisits: s.gymVisits,
          coachChat: s.coachChat,
          coachPlanLinks: s.coachPlanLinks,
        };
        return data;
      },
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
