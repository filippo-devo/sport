// Domain model. Everything is stored locally (see src/store).
// Weights are always stored in kilograms; the UI converts to the user's unit.

import type { OnboardingProfile } from '../onboarding/model';

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
  /** Planned working weight in kg (optional). */
  weight?: number;
};

/** Who made a plan: built into the app, the user, the AI trainer or a personal trainer. */
export type PlanSource = 'builtin' | 'user' | 'ai' | 'coach';

export type Routine = {
  id: string;
  name: Localized;
  items: RoutineItem[];
  source?: PlanSource;
};

export type Program = {
  id: string;
  name: Localized;
  description: Localized;
  /** Index 0 = Monday … 6 = Sunday; null = rest day. */
  schedule: (string | null)[];
  source?: PlanSource;
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
  /** Planned weight in kg carried over from the routine. */
  weight?: number;
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

export type WeighIn = { date: string; kg: number };

export type PhotoPose = 'front' | 'side' | 'back';
export type Photo = { id: string; date: string; uri: string; pose?: PhotoPose };

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

/** Values typed in by hand (absolute, not per 100 g). */
export type ManualNutrition = { name: string; kcal: number; protein: number; carbs: number; fat: number };

export type MealEntry = {
  id: string;
  date: string; // YYYY-MM-DD
  meal: MealType;
  /** Food from the database; empty when `manual` is set. */
  foodId: string;
  grams: number;
  time: string; // HH:MM
  manual?: ManualNutrition;
};

export type WaterEntry = { id: string; date: string; time: string; ml: number };

export type Supplement = {
  id: string;
  name: string;
  dose: string;
  /** Daily reminder times, HH:MM. */
  times: string[];
  reminders: boolean;
  archived?: boolean;
};

export type SupplementLog = { id: string; supplementId: string; name: string; dose: string; date: string; time: string };

/** A partner gym that accepts QR check-ins. */
export type PartnerGym = {
  id: string;
  name: string;
  address: string;
  city: string;
  /** Centre of the gym and the radius within which a check-in counts as on site. Null = no GPS check. */
  location: { lat: number; lng: number; radiusM: number } | null;
  /** Secret part of the QR code printed at the gym's reception. */
  code: string;
  /** Test entry for trying the flow; shown with a badge and its QR is viewable in the app. */
  test?: boolean;
};

/** One verified visit at a partner gym. */
export type GymVisit = {
  id: string;
  gymId: string;
  gymName: string;
  address: string;
  at: number;
  date: string;
  time: string;
  /** Where the phone was at check-in, when location was available. */
  coords?: { lat: number; lng: number; accuracyM?: number };
  distanceM?: number;
  /** 'qr+gps': code and position matched; 'qr': code matched, position unavailable or the gym has no geofence. */
  method: 'qr+gps' | 'qr';
};

export type Units = 'kg' | 'lb';

export type Goals = {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  targetWeight: number; // kg
  workoutsPerWeek: number;
  workoutsPerMonth: number;
  steps: number;
  waterMl: number;
};

export type ReminderSettings = {
  workout: { on: boolean; time: string };
  /** Evening nudge on a planned day with no workout logged. */
  missed: { on: boolean; time: string };
  water: { on: boolean; from: string; to: string; everyHours: number };
  supplements: { on: boolean };
};

export type Settings = {
  name: string;
  lang: Lang;
  units: Units;
  restSec: number;
  haptics: boolean;
  /** How often the Today screen asks for a progress photo, in days. */
  photoEveryDays: number;
  /** Profile picture (a private copy, or a data URI on web). */
  avatarUri?: string;
  /** Set when the onboarding flow has been completed (or skipped). */
  onboarded?: boolean;
  /** Answers from onboarding that have no other home yet (kept for the AI trainer). */
  profile?: OnboardingProfile;
};

/** Small stat tiles at the top of Today (the user picks up to three). */
export type TodayWidget = 'kcal' | 'workouts' | 'steps' | 'water' | 'protein' | 'weight';
/** Cards on Today, in the user's order; each can be hidden. */
export type TodayCard = 'workout' | 'nutrition' | 'water' | 'supplements' | 'unlock' | 'photo' | 'quick';
export type TodayLayout = { widgets: TodayWidget[]; cards: { id: TodayCard; on: boolean }[] };

/**
 * "Unlock your phone": a set of push-ups or squats due at chosen times of day.
 * Blocking other apps needs Apple's Screen Time API in a native build; until then the
 * app keeps the schedule, reminds and records each completed set.
 */
export type UnlockExercise = 'pushups' | 'squats';
export type UnlockChallenge = { on: boolean; exercise: UnlockExercise; reps: number; times: string[]; reminders: boolean };
export type UnlockLog = { id: string; date: string; time: string; exercise: UnlockExercise; reps: number };
