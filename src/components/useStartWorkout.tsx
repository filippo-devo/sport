import { router } from 'expo-router';
import { useState } from 'react';

import { useT } from '../i18n';
import { useStore } from '../store';
import { ConfirmSheet } from './ui/sheets';

/**
 * Starts a workout from a routine (or an empty one) and opens the logger.
 * If another workout is running, asks whether to resume it or replace it.
 */
export function useStartWorkout() {
  const { t, L } = useT();
  const active = useStore((s) => s.active);
  const startWorkout = useStore((s) => s.startWorkout);
  const discardWorkout = useStore((s) => s.discardWorkout);
  const [pending, setPending] = useState<{ routineId?: string } | null>(null);

  const begin = (routineId?: string) => {
    startWorkout(routineId);
    router.push(routineId ? '/workout' : { pathname: '/exercise-picker', params: { start: '1' } });
  };

  const start = (routineId?: string) => {
    if (active) {
      if (active.routineId && active.routineId === routineId) router.push('/workout');
      else setPending({ routineId });
      return;
    }
    begin(routineId);
  };

  const sheet = (
    <ConfirmSheet
      visible={!!pending}
      title={t('train.busyTitle')}
      body={active ? t('train.busyBody', { name: L(active.name) }) : undefined}
      confirmLabel={t('train.busyResume')}
      onConfirm={() => {
        setPending(null);
        router.push('/workout');
      }}
      secondaryLabel={t('train.busyDiscard')}
      onSecondary={() => {
        const next = pending;
        setPending(null);
        discardWorkout();
        begin(next?.routineId);
      }}
      onCancel={() => setPending(null)}
    />
  );

  return { start, sheet, active };
}
