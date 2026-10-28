// Demo data for the Training screen. No backend yet.

export type Equipment = 'barbell' | 'dumbbell' | 'cable' | 'kettlebell' | 'machine' | 'bodyweight';

export type Exercise = {
  id: string;
  name: string;
  muscle: string;
  equipment: Equipment;
  sets: number;
  reps: string;
  weight?: string;
};

export type TargetMuscle = {
  name: string;
  recovery: number; // 0–100
};

export type Workout = {
  name: string;
  muscles: TargetMuscle[];
  durationMin: number;
  exercises: Exercise[];
};

export type DayStatus = 'done' | 'today' | 'planned' | 'rest';

export type TrainingDay = {
  key: string;
  weekday: string;
  date: number;
  status: DayStatus;
  workout?: Workout;
};

const lowerBody: Workout = {
  name: 'Lower Body + Core',
  durationMin: 55,
  muscles: [
    { name: 'Hamstrings', recovery: 64 },
    { name: 'Quads', recovery: 71 },
    { name: 'Glutes', recovery: 68 },
  ],
  exercises: [
    { id: 'rdl', name: 'Dumbbell Romanian Deadlift', muscle: 'Hamstrings', equipment: 'dumbbell', sets: 3, reps: '10–8', weight: '24 kg' },
    { id: 'lunge', name: 'Dumbbell Walking Lunge', muscle: 'Quads', equipment: 'dumbbell', sets: 3, reps: '12', weight: '16 kg' },
    { id: 'sumo', name: 'Kettlebell Sumo Squat', muscle: 'Glutes', equipment: 'kettlebell', sets: 4, reps: '12–10', weight: '28 kg' },
    { id: 'calf', name: 'Standing Calf Raise', muscle: 'Calves', equipment: 'machine', sets: 3, reps: '15', weight: '60 kg' },
    { id: 'plank', name: 'Weighted Plank', muscle: 'Core', equipment: 'bodyweight', sets: 3, reps: '45 s' },
  ],
};

const upperPush: Workout = {
  name: 'Upper Body Push',
  durationMin: 52,
  muscles: [
    { name: 'Chest', recovery: 100 },
    { name: 'Shoulders', recovery: 96 },
    { name: 'Triceps', recovery: 100 },
  ],
  exercises: [
    { id: 'bench', name: 'Barbell Bench Press', muscle: 'Chest', equipment: 'barbell', sets: 4, reps: '8–6', weight: '72.5 kg' },
    { id: 'ohp', name: 'Seated Dumbbell Shoulder Press', muscle: 'Shoulders', equipment: 'dumbbell', sets: 3, reps: '10–8', weight: '22 kg' },
    { id: 'incline', name: 'Incline Dumbbell Press', muscle: 'Upper chest', equipment: 'dumbbell', sets: 3, reps: '10', weight: '26 kg' },
    { id: 'fly', name: 'Cable Chest Fly', muscle: 'Chest', equipment: 'cable', sets: 3, reps: '12', weight: '15 kg' },
    { id: 'lateral', name: 'Dumbbell Lateral Raise', muscle: 'Side delts', equipment: 'dumbbell', sets: 4, reps: '15–12', weight: '9 kg' },
    { id: 'pushdown', name: 'Rope Triceps Pushdown', muscle: 'Triceps', equipment: 'cable', sets: 3, reps: '12', weight: '27.5 kg' },
  ],
};

const pullArms: Workout = {
  name: 'Pull + Arms',
  durationMin: 48,
  muscles: [
    { name: 'Lats', recovery: 100 },
    { name: 'Upper back', recovery: 100 },
    { name: 'Biceps', recovery: 100 },
  ],
  exercises: [
    { id: 'pullup', name: 'Assisted Pull-Up', muscle: 'Lats', equipment: 'machine', sets: 4, reps: '8', weight: '−20 kg' },
    { id: 'row', name: 'Chest-Supported Dumbbell Row', muscle: 'Upper back', equipment: 'dumbbell', sets: 3, reps: '10', weight: '28 kg' },
    { id: 'pulldown', name: 'Neutral-Grip Lat Pulldown', muscle: 'Lats', equipment: 'cable', sets: 3, reps: '12–10', weight: '55 kg' },
    { id: 'facepull', name: 'Cable Face Pull', muscle: 'Rear delts', equipment: 'cable', sets: 3, reps: '15', weight: '20 kg' },
    { id: 'curl', name: 'EZ-Bar Curl', muscle: 'Biceps', equipment: 'barbell', sets: 3, reps: '10', weight: '30 kg' },
  ],
};

const legsGlutes: Workout = {
  name: 'Legs & Glutes',
  durationMin: 58,
  muscles: [
    { name: 'Glutes', recovery: 100 },
    { name: 'Quads', recovery: 100 },
    { name: 'Adductors', recovery: 100 },
  ],
  exercises: [
    { id: 'squat', name: 'Barbell Back Squat', muscle: 'Quads', equipment: 'barbell', sets: 4, reps: '6', weight: '90 kg' },
    { id: 'thrust', name: 'Barbell Hip Thrust', muscle: 'Glutes', equipment: 'barbell', sets: 4, reps: '10', weight: '100 kg' },
    { id: 'split', name: 'Bulgarian Split Squat', muscle: 'Quads', equipment: 'dumbbell', sets: 3, reps: '10', weight: '14 kg' },
    { id: 'legcurl', name: 'Seated Leg Curl', muscle: 'Hamstrings', equipment: 'machine', sets: 3, reps: '12', weight: '45 kg' },
    { id: 'adductor', name: 'Hip Adductor Machine', muscle: 'Adductors', equipment: 'machine', sets: 3, reps: '15', weight: '50 kg' },
  ],
};

export const week: TrainingDay[] = [
  { key: 'mon', weekday: 'Mon', date: 26, status: 'done', workout: lowerBody },
  { key: 'tue', weekday: 'Tue', date: 27, status: 'rest' },
  { key: 'wed', weekday: 'Wed', date: 28, status: 'today', workout: upperPush },
  { key: 'thu', weekday: 'Thu', date: 29, status: 'rest' },
  { key: 'fri', weekday: 'Fri', date: 30, status: 'planned', workout: pullArms },
  { key: 'sat', weekday: 'Sat', date: 31, status: 'planned', workout: legsGlutes },
  { key: 'sun', weekday: 'Sun', date: 1, status: 'rest' },
];

export const todayLabel = 'Wednesday, 28 October';

export const totalSets = (w: Workout) => w.exercises.reduce((n, e) => n + e.sets, 0);
