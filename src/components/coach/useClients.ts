import { useCallback, useEffect, useState } from 'react';

import { clientWorkouts, myClients, type Person } from '../../backend/coach';
import { supabase } from '../../backend/supabase';
import type { Session } from '../../data/types';
import { addDays, startOfWeek } from '../../lib/date';

const HISTORY_WEEKS = 12;

/** Coach's clients with their synced workouts; refreshes live when a client logs a workout. */
export function useClients() {
  const [clients, setClients] = useState<Person[] | null>(null);
  const [workouts, setWorkouts] = useState<Record<string, Session[]>>({});
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    try {
      const list = await myClients();
      const w = await clientWorkouts(
        list.map((c) => c.id),
        addDays(startOfWeek(), -(HISTORY_WEEKS - 1) * 7),
      );
      setClients(list);
      setWorkouts(w);
      setError(false);
    } catch {
      setError(true);
      setClients((c) => c ?? []);
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(load);
    if (!supabase) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      clearTimeout(timer);
      timer = setTimeout(load, 800);
    };
    // RLS limits these events to the coach's own clients.
    const channel = supabase
      .channel('coach-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'workouts' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'coach_clients' }, refresh)
      .subscribe();
    return () => {
      clearTimeout(timer);
      supabase!.removeChannel(channel);
    };
  }, [load]);

  return { clients, workouts, error, reload: load, weeks: HISTORY_WEEKS };
}
