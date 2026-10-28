// Domain model. Everything is stored locally (see src/store).
// Weights are always stored in kilograms; the UI converts to the user's unit.

export type Lang = 'en' | 'pl';
export type Localized = Record<Lang, string>;
export type LocalizedList = Record<Lang, string[]>;

export type Muscle =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'forearms'
  | 'core'
  | 'quads'
  | 'hamstrings'
  | 'glutes'
  | 'calves';

export type Equipment = 'barbell' | 'dumbbell' | 'kettlebell' | 'cable' | 'machine' | 'bodyweight' | 'band';

/** How a set is recorded: load × reps, reps only, or a duration in seconds. */
export type Tracking = 'weightReps' | 'reps' | 'time';

export type Exercise = {
  id: string;
  name: Localized;
  muscle: Muscle;
  secondary: Muscle[];
  equipment: Equipment;
  tracking: Tracking;
  steps: LocalizedList;
};

export type RoutineItem = {
  exerciseId: string;
  sets: number;
  /** Target reps ("8–10") or seconds ("45") depending on the exercise's tracking. */
  target: string;
  restSec: number;
};

export type Routine = {
  id: string;
  name: Localized;
  items: RoutineItem[];
};

export type Program = {
  id: string;
  name: Localized;
  description: Localized;
  /** Index 0 = Monday … 6 = Sunday; null = rest day. */
  schedule: (string | null)[];
};

export type SetEntry = {
  weight?: number; // kg
  reps?: number;
  seconds?: number;
  done: boolean;
};

export type SessionExercise = {
  exerciseId: string;
  target?: string;
  restSec: number;
  sets: SetEntry[];
};

export type Session = {
  id: string;
  name: Localized;
  routineId?: string;
  startedAt: number;
  endedAt: number;
  exercises: SessionExercise[];
};

export type RestTimer = { endsAt: number; duration: number };

export type ActiveWorkout = {
  id: string;
  name: Localized;
  routineId?: string;
  startedAt: number;
  exercises: SessionExercise[];
  rest: RestTimer | null;
};

export type WeighIn = { date: string; kg: number; sample?: boolean };

export type Photo = { id: string; date: string; uri: string };

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export type Food = {
  id: string;
  name: Localized;
  /** Per 100 g. */
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  /** Typical portion in grams, used as the default amount. */
  portion: number;
};

export type MealEntry = {
  id: string;
  date: string; // YYYY-MM-DD
  meal: MealType;
  foodId: string;
  grams: number;
  time: string; // HH:MM
};

export type Units = 'kg' | 'lb';

export type Goals = {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  targetWeight: number; // kg
  workoutsPerWeek: number;
  steps: number;
};

export type Settings = {
  name: string;
  lang: Lang;
  units: Units;
  restSec: number;
  haptics: boolean;
};
