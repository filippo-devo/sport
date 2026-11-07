import { useEffect, useState } from 'react';

import { startOfDay } from '../lib/date';
import { useStore } from '../store';
import { T, healthKit } from './healthkit';

/** True when Apple Health is connected in this build. */
export function useHealthOn(): boolean {
  const on = useStore((s) => !!s.settings.health);
  return on && healthKit() != null;
}

/** Today's steps (iPhone + Apple Watch, de-duplicated by Health) and active calories. */
export function useHealthToday(): { steps: number | null; activeKcal: number | null } {
  const on = useHealthOn();
  const [v, setV] = useState<{ steps: number | null; activeKcal: number | null }>({ steps: null, activeKcal: null });
  useEffect(() => {
    const hk = healthKit();
    if (!on || !hk) return;
    let cancelled = false;
    const read = async () => {
      try {
        const filter = { date: { startDate: startOfDay(), endDate: new Date() } };
        const [steps, kcal] = await Promise.all([
          hk.queryStatisticsForQuantity(T.steps, ['cumulativeSum'], { filter, unit: 'count' }),
          hk.queryStatisticsForQuantity(T.activeKcal, ['cumulativeSum'], { filter, unit: 'kcal' }),
        ]);
        if (!cancelled) setV({ steps: Math.round(steps.sumQuantity?.quantity ?? 0), activeKcal: Math.round(kcal.sumQuantity?.quantity ?? 0) });
      } catch {
        // No permission for a type: leave as is.
      }
    };
    void read();
    const timer = setInterval(read, 60_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [on]);
  return v;
}

/** Average and max heart rate during a time range (recorded by an Apple Watch). */
export function useHeartRate(start: number, end: number): { avg: number; max: number } | null {
  const on = useHealthOn();
  const [v, setV] = useState<{ avg: number; max: number } | null>(null);
  useEffect(() => {
    const hk = healthKit();
    if (!on || !hk || !start || end <= start) return;
    let cancelled = false;
    hk.queryStatisticsForQuantity(T.heartRate, ['discreteAverage', 'discreteMax'], {
      filter: { date: { startDate: new Date(start), endDate: new Date(end) } },
      unit: 'count/min',
    })
      .then((r) => {
        if (cancelled || !r.averageQuantity) return;
        setV({ avg: Math.round(r.averageQuantity.quantity), max: Math.round(r.maximumQuantity?.quantity ?? r.averageQuantity.quantity) });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [on, start, end]);
  return v;
}

/** Latest resting heart rate from Health. */
export function useRestingHeartRate(): number | null {
  const on = useHealthOn();
  const [v, setV] = useState<number | null>(null);
  useEffect(() => {
    const hk = healthKit();
    if (!on || !hk) return;
    let cancelled = false;
    hk.getMostRecentQuantitySample(T.restingHR, 'count/min')
      .then((r) => {
        if (!cancelled && r) setV(Math.round(r.quantity));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [on]);
  return v;
}
