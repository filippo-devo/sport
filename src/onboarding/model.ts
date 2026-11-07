import type { Goals, MyGym, Program, ReminderSettings, Units } from '../data/types';

/**
 * Onboarding answers. Everything here is either turned into real app settings on finish
 * (goals, plan, reminders, units, name) or kept on the device in `settings.profile`
 * so the AI trainer and future screens can use it.
 */
export type MainGoal = 'muscle' | 'fat' | 'strength' | 'fit' | 'endurance';
export type Focus = 'mobility' | 'consistency' | 'energy' | 'posture' | 'stress' | 'core';
export type Sex = 'male' | 'female' | 'other';
export type Experience = 'beginner' | 'intermediate' | 'advanced';
export type Pushups = '0-5' | '6-15' | '16-30' | '30+';
export type Place = 'gym' | 'home' | 'both';
export type Activity = 'sedentary' | 'light' | 'active' | 'very';

export type OnboardingAnswers = {
  name: string;
  goal: MainGoal;
  focus: Focus[];
  sex: Sex;
  age: number;
  heightCm: number;
  weightKg: number;
  targetKg: number;
  units: Units;
  experience: Experience;
  pushups: Pushups;
  place: Place;
  /** Gyms picked in the gym search (skipped when training only at home). */
  gyms: MyGym[];
  /** Index 0 = Monday … 6 = Sunday. */
  days: number[];
  sessionMin: number;
  activity: Activity;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  waterMl: number;
  steps: number;
  workoutReminder: boolean;
  workoutTime: string;
  waterReminder: boolean;
};

export const DEFAULT_ANSWERS: OnboardingAnswers = {
  name: '',
  goal: 'muscle',
  focus: [],
  sex: 'male',
  age: 28,
  heightCm: 178,
  weightKg: 78,
  targetKg: 78,
  units: 'kg',
  experience: 'intermediate',
  pushups: '6-15',
  place: 'gym',
  gyms: [],
  days: [0, 2, 4],
  sessionMin: 60,
  activity: 'light',
  kcal: 2400,
  protein: 160,
  carbs: 260,
  fat: 75,
  waterMl: 2500,
  steps: 8000,
  workoutReminder: true,
  workoutTime: '17:00',
  waterReminder: false,
};

/**
 * Preview mode while onboarding lives on its own branch: it opens on every launch and
 * finishing it changes nothing, so testing it in Expo Go never overwrites real data.
 * Set to false before merging into main.
 */
export const ONBOARDING_PREVIEW = true;

const ACTIVITY_FACTOR: Record<Activity, number> = { sedentary: 1.2, light: 1.375, active: 1.55, very: 1.725 };
const GOAL_ADJUST: Record<MainGoal, number> = { muscle: 1.1, fat: 0.82, strength: 1.05, fit: 1, endurance: 1.05 };

const round = (n: number, step: number) => Math.round(n / step) * step;

/** Mifflin–St Jeor BMR × activity, adjusted for the goal. */
export function suggestNutrition(a: OnboardingAnswers): Pick<Goals, 'kcal' | 'protein' | 'carbs' | 'fat'> {
  const sexTerm = a.sex === 'male' ? 5 : a.sex === 'female' ? -161 : -78;
  const bmr = 10 * a.weightKg + 6.25 * a.heightCm - 5 * a.age + sexTerm;
  // Training days add roughly 2.5% each on top of everyday activity.
  const tdee = bmr * (ACTIVITY_FACTOR[a.activity] + a.days.length * 0.025);
  const kcal = Math.max(1200, round(tdee * GOAL_ADJUST[a.goal], 10));
  const perKg = a.goal === 'fat' || a.goal === 'muscle' || a.goal === 'strength' ? 2 : 1.6;
  const protein = round(a.weightKg * perKg, 5);
  const fat = round((kcal * 0.27) / 9, 5);
  const carbs = Math.max(50, round((kcal - protein * 4 - fat * 9) / 4, 5));
  return { kcal, protein, carbs, fat };
}

export function suggestWater(weightKg: number, days: number): number {
  return Math.min(5000, round(weightKg * 33 + days * 100, 250));
}

export function suggestSteps(activity: Activity): number {
  return { sedentary: 6000, light: 8000, active: 10000, very: 12000 }[activity];
}

/** Gender-neutral BMI read-out for the weight step. */
export function bmi(weightKg: number, heightCm: number): number {
  const m = heightCm / 100;
  return weightKg / (m * m);
}

/**
 * Builds a weekly plan from the built-in routines on the days the user picked.
 * 1–3 days: alternating full-body A/B. 4+ days: upper/lower split, extra days full body.
 */
export function buildSchedule(days: number[]): (string | null)[] {
  const sorted = [...days].sort((x, y) => x - y);
  const split = sorted.length <= 3 ? ['full-a', 'full-b'] : ['lower-a', 'upper-push', 'pull-arms', 'legs-glutes', 'full-a', 'full-b', 'full-a'];
  const schedule: (string | null)[] = Array(7).fill(null);
  sorted.forEach((d, i) => {
    schedule[d] = split[i % split.length];
  });
  return schedule;
}

export function buildProgram(a: OnboardingAnswers): Program {
  const n = a.days.length;
  return {
    id: 'onboarding-plan',
    name: { en: `My plan · ${n}× a week`, pl: `Mój plan · ${n}× w tygodniu` },
    description: {
      en: n <= 3 ? 'Full-body sessions on your chosen days, built during onboarding.' : 'Upper / lower split on your chosen days, built during onboarding.',
      pl: n <= 3 ? 'Treningi całego ciała w wybrane dni, ułożone podczas onboardingu.' : 'Podział góra / dół w wybrane dni, ułożony podczas onboardingu.',
    },
    schedule: buildSchedule(a.days),
    source: 'user',
  };
}

export function remindersFrom(a: OnboardingAnswers, current: ReminderSettings): Partial<ReminderSettings> {
  return {
    workout: { on: a.workoutReminder, time: a.workoutTime },
    water: { ...current.water, on: a.waterReminder },
  };
}

export type OnboardingProfile = Pick<
  OnboardingAnswers,
  'goal' | 'focus' | 'sex' | 'age' | 'heightCm' | 'experience' | 'pushups' | 'place' | 'sessionMin' | 'activity'
> & { completedAt: string };

export function profileFrom(a: OnboardingAnswers): OnboardingProfile {
  const { goal, focus, sex, age, heightCm, experience, pushups, place, sessionMin, activity } = a;
  return { goal, focus, sex, age, heightCm, experience, pushups, place, sessionMin, activity, completedAt: new Date().toISOString() };
}
