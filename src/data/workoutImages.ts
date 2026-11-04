import type { ImageSourcePropType } from 'react-native';

/**
 * Photos for the workout card on Today, keyed by routine id. Filip supplies the images:
 * drop a file into assets/workouts/ and map it here, e.g.
 *   'upper-push': require('../../assets/workouts/upper-push.jpg'),
 * Routines without a photo get the gradient backdrop.
 */
export const WORKOUT_IMAGES: Record<string, ImageSourcePropType> = {
  'upper-push': require('../../assets/workouts/upper-push.jpg'),
};

/**
 * Background photos for the hero card on Train, keyed by routine id. Falls back to
 * WORKOUT_IMAGES, then to the gradient.
 */
export const TRAIN_IMAGES: Record<string, ImageSourcePropType> = {
  'upper-push': require('../../assets/workouts/upper-push-train.jpg'),
};
