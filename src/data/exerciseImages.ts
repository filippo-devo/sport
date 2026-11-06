import type { ImageSourcePropType } from 'react-native';

/**
 * Background photos for exercises, keyed by exercise id (see src/data/exercises.ts).
 * Filip supplies the images: drop a file into assets/exercises/ and map it here.
 * Exercises without a photo get a dark gradient; the muscle ring shows either way.
 */
export const EXERCISE_IMAGES: Record<string, ImageSourcePropType> = {
  // Trial photo: the seated press shot Filip sent for the Train hero.
  'seated-dumbbell-press': require('../../assets/workouts/upper-push-train.jpg'),
};
