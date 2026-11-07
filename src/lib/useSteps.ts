import { Pedometer } from 'expo-sensors';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

import { useHealthToday } from '../health/useHealth';
import { startOfDay } from './date';

/**
 * Today's step count: from Apple Health when it's connected (that includes Apple
 * Watch steps), otherwise from the iPhone pedometer. Null where a full-day count
 * isn't available (web, and Android, which only counts from subscription time).
 */
export function useTodaySteps(): number | null {
  const health = useHealthToday().steps;
  const phone = usePedometerSteps();
  return health ?? phone;
}

function usePedometerSteps(): number | null {
  const [steps, setSteps] = useState<number | null>(null);
  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | undefined;
    (async () => {
      try {
        if (!(await Pedometer.isAvailableAsync())) return;
        const perm = await Pedometer.requestPermissionsAsync();
        if (!perm.granted) return;
        const read = async () => {
          const r = await Pedometer.getStepCountAsync(startOfDay(), new Date());
          if (!cancelled) setSteps(r.steps);
        };
        await read();
        timer = setInterval(read, 60_000);
      } catch {
        // Sensor unavailable: keep null.
      }
    })();
    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, []);
  return steps;
}
