import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

// Apple Health (HealthKit) through @kingstinct/react-native-healthkit.
// The library is a Nitro native module that exists only in a real iOS build
// (TestFlight / EAS development build). Expo Go, Android and web don't have it,
// and importing it there throws, so it is loaded lazily and every caller must
// handle `null`.

export type HK = typeof import('@kingstinct/react-native-healthkit');

let cached: HK | null | undefined;

export function healthKit(): HK | null {
  if (cached !== undefined) return cached;
  cached = null;
  if (Platform.OS !== 'ios' || Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return cached;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const hk = require('@kingstinct/react-native-healthkit') as HK;
    if (hk.isHealthDataAvailable()) cached = hk;
  } catch {
    // Native module missing from this binary.
  }
  return cached;
}

/** True when this build can talk to Apple Health (iPhone, real app build). */
export const healthAvailable = () => healthKit() != null;

export const T = {
  workout: 'HKWorkoutTypeIdentifier',
  steps: 'HKQuantityTypeIdentifierStepCount',
  activeKcal: 'HKQuantityTypeIdentifierActiveEnergyBurned',
  heartRate: 'HKQuantityTypeIdentifierHeartRate',
  restingHR: 'HKQuantityTypeIdentifierRestingHeartRate',
  bodyMass: 'HKQuantityTypeIdentifierBodyMass',
  kcal: 'HKQuantityTypeIdentifierDietaryEnergyConsumed',
  protein: 'HKQuantityTypeIdentifierDietaryProtein',
  carbs: 'HKQuantityTypeIdentifierDietaryCarbohydrates',
  fat: 'HKQuantityTypeIdentifierDietaryFatTotal',
  water: 'HKQuantityTypeIdentifierDietaryWater',
  food: 'HKCorrelationTypeIdentifierFood',
} as const;

/** What GameChanger writes to Health. */
export const SHARE_TYPES = [T.workout, T.activeKcal, T.bodyMass, T.kcal, T.protein, T.carbs, T.fat, T.water, T.food] as const;
/** What GameChanger reads from Health. */
export const READ_TYPES = [T.steps, T.activeKcal, T.heartRate, T.restingHR, T.bodyMass, T.workout] as const;

/** Shows Apple's permission sheet (only the first time; later calls resolve at once). */
export async function requestHealthAccess(): Promise<boolean> {
  const hk = healthKit();
  if (!hk) return false;
  try {
    return await hk.requestAuthorization({ toShare: [...SHARE_TYPES], toRead: [...READ_TYPES] });
  } catch {
    return false;
  }
}
