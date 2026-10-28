import type { Program, Routine } from './types';

// Seed routines and programs. Rest is in seconds; targets are reps (or seconds for timed holds).
export const ROUTINES: Routine[] = [
  {
    id: 'lower-a',
    name: { en: 'Lower Body + Core', pl: 'Dół ciała + core' },
    items: [
      { exerciseId: 'dumbbell-rdl', sets: 3, target: '10–8', restSec: 120 },
      { exerciseId: 'walking-lunge', sets: 3, target: '12', restSec: 90 },
      { exerciseId: 'kettlebell-sumo-squat', sets: 4, target: '12–10', restSec: 90 },
      { exerciseId: 'standing-calf-raise', sets: 3, target: '15', restSec: 60 },
      { exerciseId: 'plank', sets: 3, target: '45', restSec: 60 },
    ],
  },
  {
    id: 'upper-push',
    name: { en: 'Upper Body Push', pl: 'Góra ciała: wypychanie' },
    items: [
      { exerciseId: 'barbell-bench-press', sets: 4, target: '8–6', restSec: 150 },
      { exerciseId: 'seated-dumbbell-press', sets: 3, target: '10–8', restSec: 120 },
      { exerciseId: 'incline-dumbbell-press', sets: 3, target: '10', restSec: 90 },
      { exerciseId: 'cable-fly', sets: 3, target: '12', restSec: 60 },
      { exerciseId: 'lateral-raise', sets: 4, target: '15–12', restSec: 60 },
      { exerciseId: 'rope-pushdown', sets: 3, target: '12', restSec: 60 },
    ],
  },
  {
    id: 'pull-arms',
    name: { en: 'Pull + Arms', pl: 'Przyciąganie + ramiona' },
    items: [
      { exerciseId: 'lat-pulldown', sets: 4, target: '10–8', restSec: 120 },
      { exerciseId: 'chest-supported-row', sets: 3, target: '10', restSec: 90 },
      { exerciseId: 'seated-cable-row', sets: 3, target: '12–10', restSec: 90 },
      { exerciseId: 'face-pull', sets: 3, target: '15', restSec: 60 },
      { exerciseId: 'ez-bar-curl', sets: 3, target: '10', restSec: 60 },
      { exerciseId: 'hammer-curl', sets: 2, target: '12', restSec: 60 },
    ],
  },
  {
    id: 'legs-glutes',
    name: { en: 'Legs & Glutes', pl: 'Nogi i pośladki' },
    items: [
      { exerciseId: 'back-squat', sets: 4, target: '6', restSec: 180 },
      { exerciseId: 'hip-thrust', sets: 4, target: '10', restSec: 120 },
      { exerciseId: 'bulgarian-split-squat', sets: 3, target: '10', restSec: 90 },
      { exerciseId: 'seated-leg-curl', sets: 3, target: '12', restSec: 60 },
      { exerciseId: 'hip-abduction', sets: 3, target: '15', restSec: 60 },
    ],
  },
  {
    id: 'full-a',
    name: { en: 'Full Body A', pl: 'Całe ciało A' },
    items: [
      { exerciseId: 'back-squat', sets: 3, target: '8', restSec: 150 },
      { exerciseId: 'barbell-bench-press', sets: 3, target: '8', restSec: 150 },
      { exerciseId: 'barbell-row', sets: 3, target: '10', restSec: 120 },
      { exerciseId: 'lateral-raise', sets: 2, target: '15', restSec: 60 },
      { exerciseId: 'hanging-leg-raise', sets: 3, target: '12', restSec: 60 },
    ],
  },
  {
    id: 'full-b',
    name: { en: 'Full Body B', pl: 'Całe ciało B' },
    items: [
      { exerciseId: 'deadlift', sets: 3, target: '5', restSec: 180 },
      { exerciseId: 'overhead-press', sets: 3, target: '8', restSec: 150 },
      { exerciseId: 'pull-up', sets: 3, target: '8', restSec: 120 },
      { exerciseId: 'leg-press', sets: 3, target: '12', restSec: 90 },
      { exerciseId: 'dumbbell-curl', sets: 2, target: '12', restSec: 60 },
    ],
  },
];

export const PROGRAMS: Program[] = [
  {
    id: 'upper-lower',
    name: { en: 'Upper / Lower 4×', pl: 'Góra / dół 4×' },
    description: {
      en: 'Four sessions a week, alternating lower and upper body. Good balance of strength and size.',
      pl: 'Cztery treningi w tygodniu, na zmianę dół i góra ciała. Dobry balans siły i masy.',
    },
    schedule: ['lower-a', null, 'upper-push', null, 'pull-arms', 'legs-glutes', null],
  },
  {
    id: 'full-body',
    name: { en: 'Full Body 3×', pl: 'Całe ciało 3×' },
    description: {
      en: 'Three full-body sessions a week. Simple, efficient, great for busy weeks.',
      pl: 'Trzy treningi całego ciała w tygodniu. Prosto i skutecznie, gdy brakuje czasu.',
    },
    schedule: ['full-a', null, 'full-b', null, 'full-a', null, null],
  },
];
