import { addDays, dayKey, startOfDay, weekdayIndex } from '../lib/date';
import { EXERCISE_BY_ID } from './exercises';
import { PROGRAMS, ROUTINES } from './programs';
import type { MealEntry, MealType, Routine, Session, WeighIn } from './types';

// Sample history so charts, records and the food diary have something to show
// on first launch. Deterministic (seeded PRNG) and relative to the install date.
// Profile → "Clear sample data" removes it.

function rng(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Working weights (kg) eight weeks ago; they progress ~1.2% a week.
const START_KG: Record<string, number> = {
  'dumbbell-rdl': 20,
  'walking-lunge': 12,
  'kettlebell-sumo-squat': 24,
  'standing-calf-raise': 50,
  'barbell-bench-press': 65,
  'seated-dumbbell-press': 18,
  'incline-dumbbell-press': 22,
  'cable-fly': 12.5,
  'lateral-raise': 7,
  'rope-pushdown': 22.5,
  'lat-pulldown': 50,
  'chest-supported-row': 24,
  'seated-cable-row': 50,
  'face-pull': 17.5,
  'ez-bar-curl': 25,
  'hammer-curl': 12,
  'back-squat': 80,
  'hip-thrust': 90,
  'bulgarian-split-squat': 12,
  'seated-leg-curl': 40,
  'hip-abduction': 45,
};

const WEEKS = 8;

function parseTarget(target: string): [number, number] {
  const nums = target.split(/[–-]/).map((s) => parseInt(s, 10));
  return nums.length === 2 ? [Math.min(nums[0], nums[1]), Math.max(nums[0], nums[1])] : [nums[0], nums[0]];
}

function sessionFor(routine: Routine, day: Date, week: number, rand: () => number): Session {
  const start = new Date(day);
  start.setHours(17 + Math.floor(rand() * 3), Math.floor(rand() * 60));
  const exercises = routine.items.map((item) => {
    const ex = EXERCISE_BY_ID[item.exerciseId];
    const [lo, hi] = parseTarget(item.target);
    const base = START_KG[item.exerciseId] ?? 20;
    const step = ex.equipment === 'dumbbell' || ex.equipment === 'kettlebell' ? 1 : 2.5;
    const kg = Math.round((base * (1 + 0.012 * week)) / step) * step;
    return {
      exerciseId: item.exerciseId,
      target: item.target,
      restSec: item.restSec,
      sets: Array.from({ length: item.sets }, (_, i) => {
        const reps = Math.max(lo, hi - i - (rand() < 0.3 ? 1 : 0));
        if (ex.tracking === 'time') return { seconds: 40 + Math.round(rand() * 4) * 5 + week * 2, done: true };
        if (ex.tracking === 'reps') return { reps, done: true };
        return { weight: kg, reps, done: true };
      }),
    };
  });
  const minutes = 42 + Math.round(rand() * 20);
  return {
    id: `sample-${dayKey(day)}`,
    name: routine.name,
    routineId: routine.id,
    startedAt: start.getTime(),
    endedAt: start.getTime() + minutes * 60000,
    exercises,
  };
}

export function sampleSessions(now: Date): Session[] {
  const rand = rng(42);
  const program = PROGRAMS[0];
  const today = startOfDay(now);
  const sessions: Session[] = [];
  for (let d = WEEKS * 7; d >= 1; d--) {
    const day = addDays(today, -d);
    const routineId = program.schedule[weekdayIndex(day)];
    if (!routineId || rand() < 0.1) continue;
    const routine = ROUTINES.find((r) => r.id === routineId)!;
    sessions.push(sessionFor(routine, day, WEEKS - Math.ceil(d / 7), rand));
  }
  return sessions;
}

export function sampleWeighIns(now: Date): WeighIn[] {
  const rand = rng(7);
  const today = startOfDay(now);
  const out: WeighIn[] = [];
  for (let d = WEEKS * 7; d >= 0; d--) {
    if (d > 0 && rand() < 0.3) continue;
    const trend = 83.6 - (2.3 * (WEEKS * 7 - d)) / (WEEKS * 7);
    out.push({ date: dayKey(addDays(today, -d)), kg: Math.round((trend + (rand() - 0.5) * 0.8) * 10) / 10, sample: true });
  }
  return out;
}

// Meal templates: [foodId, grams] per item.
const TEMPLATES: Record<MealType, [string, number][][]> = {
  breakfast: [
    [['oats', 70], ['milk', 200], ['blueberries', 100], ['whey', 30]],
    [['egg', 165], ['wholegrain-bread', 70], ['avocado', 50], ['tomato', 120]],
    [['skyr', 200], ['banana', 120], ['almonds', 20]],
  ],
  lunch: [
    [['chicken-breast', 180], ['rice', 220], ['broccoli', 150], ['olive-oil', 8]],
    [['salmon', 150], ['potatoes', 250], ['mixed-salad', 100]],
    [['lentil-soup', 350], ['wholegrain-bread', 50]],
  ],
  dinner: [
    [['beef', 150], ['sweet-potato', 220], ['mixed-salad', 120], ['olive-oil', 10]],
    [['turkey', 160], ['pasta', 200], ['tomato', 150], ['mozzarella', 40]],
    [['tuna', 120], ['rice', 180], ['avocado', 60]],
  ],
  snack: [
    [['protein-bar', 60]],
    [['greek-yogurt', 170], ['apple', 180]],
    [['cottage-cheese', 200]],
    [['hummus', 60], ['wholegrain-bread', 40]],
    [['dark-chocolate', 20], ['almonds', 25]],
  ],
};

const MEAL_TIME: Record<MealType, number> = { breakfast: 8, lunch: 13, dinner: 19, snack: 16 };

export function sampleMeals(now: Date): MealEntry[] {
  const rand = rng(99);
  const today = startOfDay(now);
  const out: MealEntry[] = [];
  const pick = <T,>(xs: T[]) => xs[Math.floor(rand() * xs.length)];
  for (let d = 14; d >= 0; d--) {
    const date = dayKey(addDays(today, -d));
    // Today only has the meals that would already be eaten.
    const meals: MealType[] = d === 0 ? (['breakfast', 'snack'] as MealType[]).filter((m) => now.getHours() >= MEAL_TIME[m]) : ['breakfast', 'lunch', 'snack', 'dinner'];
    for (const meal of meals) {
      const items = pick(TEMPLATES[meal]);
      const minute = Math.floor(rand() * 50);
      items.forEach(([foodId, grams], i) => {
        out.push({
          id: `sample-${date}-${meal}-${i}`,
          date,
          meal,
          foodId,
          grams: Math.round(grams * (0.9 + rand() * 0.25)),
          time: `${String(MEAL_TIME[meal]).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
        });
      });
    }
  }
  return out;
}
